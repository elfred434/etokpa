// Appels API d’authentification, 2FA, inscription, mot de passe et profil utilisateur.
import { apiClient } from './client';
import { initEcho, shutdownEcho } from '../realtime/echo';
import { clearLocalPhotos } from '../../utils/profilePhoto';
import { clearCartStorage } from '../../utils/cartStorage';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  password: string;
  password_confirmation: string;
  accept_cgu: boolean;
  opt_in_sms: boolean;
  ville?: string;
  role?: 'client' | 'manager' | 'livreur' | 'admin' | 'super_admin';
  quartier?: string;
  zone_id?: number;
  heure_debut?: string;
  heure_fin?: string;
  documents?: unknown[];
}

export interface Verify2FAPayload {
  email: string;
  code: string;
}

export interface UserProfile {
  id: number;
  nom: string;
  prenom: string;
  nom_complet: string;
  email: string;
  telephone: string;
  image_profil?: string | null;
  id_role: number;
  role?: {
    id: number;
    nom: string;
    permissions?: string[];
  };
  statut: string;
  stats?: {
    commandes_effectuees?: number;
    points_repere_enregistres?: number;
  };
  profil?: Record<string, unknown>;
}

// Regroupe les appels API du module auth.
export const authApi = {
  // Appelle POST /auth/login via le client API.
  login: async (payload: LoginPayload) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },

  // Appelle POST /auth/verify-2fa via le client API.
  verify2fa: async (payload: Verify2FAPayload) => {
    const response = await apiClient.post('/auth/verify-2fa', payload);
    const body = response.data ?? {};
    const data = body.data ?? body;
    const token = body.token ?? body.access_token ?? data.access_token ?? data.token;
    if (typeof token === 'string' && token.trim()) {
      localStorage.setItem('tokpa_token', token);
      const rawUser = body.user ?? data.user;
      const user = rawUser?.data ?? rawUser;
      localStorage.setItem('tokpa_user', JSON.stringify(user));
      initEcho();
      window.dispatchEvent(new Event('tokpa:auth-changed'));
    }
    return response.data;
  },

  // Appelle POST /auth/register via le client API.
  register: async (payload: RegisterPayload) => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  // Appelle POST /auth/resend-2fa via le client API.
  resend2fa: async (email: string) => {
    const response = await apiClient.post('/auth/resend-2fa', { email });
    return response.data;
  },

  // Appelle GET /profile via le client API.
  getProfile: async () => {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  // Appelle PUT /profile via le client API.
  updateProfile: async (data: Partial<UserProfile> & Record<string, unknown>) => {
    const response = await apiClient.put('/profile', data);
    return response.data;
  },

  // Appelle GET /dashboard via le client API.
  getDashboard: async (): Promise<{ commandes: number; en_cours: number; ca: number | string | null }> => {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },

  // Appelle POST /auth/change-password via le client API.
  changePassword: async (payload: { current_password: string; new_password: string; new_password_confirmation: string }) => {
    const response = await apiClient.post('/auth/change-password', payload);
    return response.data;
  },

  // Appelle POST /auth/forgot-password via le client API.
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Appelle POST /auth/reset-password via le client API.
  resetPassword: async (payload: { email: string; token: string; password: string; password_confirmation: string }) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },

  // Appelle POST /auth/logout via le client API.
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('tokpa_token');
      localStorage.removeItem('tokpa_user');
      clearCartStorage();
      localStorage.removeItem('tokpa_cart_lieu');
      sessionStorage.removeItem('tokpa_cart_lieu');
      clearLocalPhotos();
      shutdownEcho();
      window.dispatchEvent(new Event('tokpa:auth-changed'));
    }
  },
};
