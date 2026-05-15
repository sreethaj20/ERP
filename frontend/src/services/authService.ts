import api from "../api/apiClient";

export const loginUser = async (email: string, password: string) => {
  try {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const response = await api.post("auth/login", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token, user } = response.data;
    
    // Always store the token immediately in sessionStorage
    sessionStorage.setItem("token", access_token);
    sessionStorage.setItem("isLoggedIn", "true");

    return response.data; // Return full data so LoginPage can also read it
  } catch (error: any) {
    const message = error.response?.data?.detail || "Invalid email or password";
    throw new Error(message);
  }
};

export const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login";
};

export const changePassword = async (oldPassword: string, newPassword: string) => {
    const response = await api.post("auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword
    });
    return response.data;
};

export const requestPasswordReset = async (email: string) => {
    try {
        const formData = new FormData();
        formData.append("email", email);
        const response = await api.post("auth/request-password-reset", formData);
        return response.data; // Now returns { token: "..." } for demo
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || "Verification failed");
    }
};

export const verifyResetToken = async (email: string, token: string) => {
    try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("token", token);
        const response = await api.post("auth/verify-reset-token", formData);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || "Token verification failed");
    }
};

export const resetPassword = async (email: string, token: string, newPassword: string) => {
    try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("token", token);
        formData.append("new_password", newPassword);
        const response = await api.post("auth/reset-password", formData);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || "Reset failed");
    }
};
