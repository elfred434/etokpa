import { apiClient } from './client';

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
  role?: 'client' | 'manager' | 'livreur' | 'admin' | 'super_admin';
  quartier?: string;
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
  image_profil?: string;
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

export const authApi = {
  // POST /api/auth/login -> déclenche l'envoi du code 2FA
  login: async (payload: LoginPayload) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },

  // POST /api/auth/verify-2fa -> valide le code OTP et retourne le token Sanctum
  verify2fa: async (payload: Verify2FAPayload) => {
    const response = await apiClient.post('/auth/verify-2fa', payload);
    if (response.data?.token) {
      localStorage.setItem('tokpa_token', response.data.token);
      localStorage.setItem('tokpa_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // POST /api/auth/register -> création de compte et envoi 2FA
  register: async (payload: RegisterPayload) => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  // POST /api/auth/resend-2fa -> renvoi du code 2FA
  resend2fa: async (email: string) => {
    const response = await apiClient.post('/auth/resend-2fa', { email });
    return response.data;
  },

  // GET /api/profile -> profil utilisateur authentifié
  getProfile: async () => {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  // PUT /api/profile -> mise à jour profil
  updateProfile: async (data: Partial<UserProfile> & Record<string, unknown>) => {
    const response = await apiClient.put('/profile', data);
    return response.data;
  },

  // POST /api/auth/logout -> déconnexion
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('tokpa_token');
      localStorage.removeItem('tokpa_user');
    }
  },
};
