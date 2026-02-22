import { signInWithFreighter, isConnected, signTransaction } from "@stellar/freighter-api";

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  walletAddress?: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  name?: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  twoFactorMethods?: string[];
  error?: string;
}

class AuthService {
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage() {
    this.token = localStorage.getItem('authToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private saveTokensToStorage(token: string, refreshToken: string) {
    this.token = token;
    this.refreshToken = refreshToken;
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokensFromStorage() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Registration failed' };
      }

      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.requiresTwoFactor) {
          return {
            success: false,
            requiresTwoFactor: true,
            twoFactorMethods: result.twoFactorMethods,
            error: result.error
          };
        }
        return { success: false, error: result.error || 'Login failed' };
      }

      if (result.token && result.refreshToken) {
        this.saveTokensToStorage(result.token, result.refreshToken);
      }

      return {
        success: true,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async loginWithWallet(): Promise<AuthResponse> {
    try {
      if (!(await isConnected())) {
        return { success: false, error: 'Please install Freighter Wallet' };
      }

      const publicKey = await signInWithFreighter();

      const response = await this.request('/auth/wallet', {
        method: 'POST',
        body: JSON.stringify({ walletAddress: publicKey }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Wallet login failed' };
      }

      if (result.token && result.refreshToken) {
        this.saveTokensToStorage(result.token, result.refreshToken);
      }

      return {
        success: true,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      };
    } catch (error) {
      return { success: false, error: 'Wallet connection failed' };
    }
  }

  async logout(): Promise<boolean> {
    try {
      if (this.token) {
        await this.request('/auth/logout', {
          method: 'POST',
        });
      }

      this.clearTokensFromStorage();
      return true;
    } catch (error) {
      return false;
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      return { success: false, error: 'No refresh token' };
    }

    try {
      const response = await this.request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        this.clearTokensFromStorage();
        return { success: false, error: result.error || 'Token refresh failed' };
      }

      if (result.token && result.refreshToken) {
        this.saveTokensToStorage(result.token, result.refreshToken);
      }

      return {
        success: true,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      };
    } catch (error) {
      this.clearTokensFromStorage();
      return { success: false, error: 'Network error' };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await this.request('/user/profile');

      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          // Retry with new token
          const retryResponse = await this.request('/user/profile');
          if (retryResponse.ok) {
            const result = await retryResponse.json();
            return result.user;
          }
        }
        this.clearTokensFromStorage();
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      return null;
    }
  }

  async updateProfile(data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.request('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Profile update failed' };
      }

      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.request('/user/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Password change failed' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async enableTwoFactor(method: string): Promise<{ success: boolean; secret?: string; qrCode?: string; backupCodes?: string[]; error?: string }> {
    try {
      const response = await this.request('/user/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ method }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '2FA enable failed' };
      }

      return {
        success: true,
        secret: result.secret,
        qrCode: result.qrCode,
        backupCodes: result.backupCodes
      };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  getAuthHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
}

export const authService = new AuthService();
