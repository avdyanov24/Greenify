const API_URL = import.meta.env.VITE_API_URL || "/api";

class APIClient {
  private getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(body.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────
  async register(email: string, password: string, username: string, displayName: string) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, username, displayName }),
    });
  }

  async login(email: string, password: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request("/auth/logout", { method: "POST" });
  }

  // ── POSTS ─────────────────────────────────────────────────────────────────
  async createPost(data: {
    title: string;
    description?: string;
    plantType: string;
    latitude: number;
    longitude: number;
    images: string[];
  }) {
    return this.request("/posts", { method: "POST", body: JSON.stringify(data) });
  }

  async getPosts(page = 1, limit = 20, plantType?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (plantType) params.set("plantType", plantType);
    return this.request(`/posts?${params}`);
  }

  async getPost(postId: string) {
    return this.request(`/posts/${postId}`);
  }

  async getPostComments(postId: string) {
    return this.request(`/posts/${postId}/comments`);
  }

  async createComment(postId: string, text: string) {
    return this.request(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ text }) });
  }

  async reportPost(postId: string, reason: string) {
    return this.request(`/posts/${postId}/report`, { method: "POST", body: JSON.stringify({ reason }) });
  }

  // ── MAP ───────────────────────────────────────────────────────────────────
  async getMapData() {
    return this.request("/map");
  }

  async getHexDetails(h3Index: string) {
    return this.request(`/map/hex/${h3Index}`);
  }

  async getUserHexes(userId: string) {
    return this.request(`/map/user/${userId}`);
  }

  async getOrgHexes(orgId: string) {
    return this.request(`/map/organization/${orgId}`);
  }

  // ── PROFILE ───────────────────────────────────────────────────────────────
  async getProfile(userId: string) {
    return this.request(`/profile/${userId}`);
  }

  async getMyProfile() {
    return this.request("/profile/me");
  }

  async updateProfile(data: {
    displayName?: string;
    bio?: string;
    bioForHire?: string;
    availableForHire?: boolean;
  }) {
    return this.request("/profile/me", { method: "PATCH", body: JSON.stringify(data) });
  }

  async followUser(userId: string) {
    return this.request(`/profile/follow/${userId}`, { method: "POST" });
  }

  async unfollowUser(userId: string) {
    return this.request(`/profile/follow/${userId}`, { method: "DELETE" });
  }

  async getLeaderboard(sort: "gp" | "hexes" | "xp" = "gp") {
    return this.request(`/profile/leaderboard?sort=${sort}`);
  }

  // ── ENDORSEMENTS ──────────────────────────────────────────────────────────
  async endorsePost(postId: string) {
    return this.request("/endorsements", { method: "POST", body: JSON.stringify({ postId }) });
  }

  async getPostEndorsements(postId: string) {
    return this.request(`/endorsements/post/${postId}`);
  }

  async getUserEndorsements(userId: string) {
    return this.request(`/endorsements/user/${userId}`);
  }

  // ── MARKETPLACE ───────────────────────────────────────────────────────────
  async getTasks(status: "open" | "all" | "in-progress" | "completed" = "open") {
    return this.request(`/marketplace/tasks?status=${status}`);
  }

  async getTask(taskId: string) {
    return this.request(`/marketplace/tasks/${taskId}`);
  }

  async createTask(data: { title: string; description: string; budgetGP: number }) {
    return this.request("/marketplace/tasks", { method: "POST", body: JSON.stringify(data) });
  }

  async getMyTasks() {
    return this.request("/marketplace/my-tasks");
  }

  async applyForTask(taskId: string, proposedGP: number) {
    return this.request("/marketplace/applications", {
      method: "POST",
      body: JSON.stringify({ taskId, proposedGP }),
    });
  }

  async acceptApplication(appId: string) {
    return this.request(`/marketplace/applications/${appId}/accept`, { method: "POST" });
  }

  async completeTask(taskId: string, review?: { rating: number; comment?: string }) {
    return this.request(`/marketplace/tasks/${taskId}/complete`, {
      method: "POST",
      body: JSON.stringify(review || {}),
    });
  }

  async submitReview(taskId: string, rating: number, comment?: string) {
    return this.request(`/marketplace/tasks/${taskId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    });
  }

  async getUserReviews(userId: string) {
    return this.request(`/marketplace/reviews/user/${userId}`);
  }

  async getWorkers() {
    return this.request("/marketplace/workers");
  }

  // ── ORGANIZATIONS ─────────────────────────────────────────────────────────
  async getOrganizations() {
    return this.request("/organizations");
  }

  async createOrganization(data: {
    name: string;
    description?: string;
    distributionMode?: string;
    leaderCutPercent?: number;
  }) {
    return this.request("/organizations", { method: "POST", body: JSON.stringify(data) });
  }

  async getOrganization(orgId: string) {
    return this.request(`/organizations/${orgId}`);
  }

  async updateOrganization(
    orgId: string,
    data: { name?: string; description?: string; distributionMode?: string; leaderCutPercent?: number },
  ) {
    return this.request(`/organizations/${orgId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async joinOrg(orgId: string) {
    return this.request(`/organizations/${orgId}/join`, { method: "POST" });
  }

  async leaveOrg(orgId: string) {
    return this.request(`/organizations/${orgId}/leave`, { method: "POST" });
  }

  async removeMember(orgId: string, userId: string) {
    return this.request(`/organizations/${orgId}/members/${userId}`, { method: "DELETE" });
  }

  // ── VOUCHERS ──────────────────────────────────────────────────────────────
  async getVouchers() {
    return this.request("/vouchers");
  }

  async redeemVoucher(voucherId: string) {
    return this.request("/vouchers/redeem", { method: "POST", body: JSON.stringify({ voucherId }) });
  }

  async getMyVouchers() {
    return this.request("/vouchers/my-vouchers");
  }

  // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
  async getMySubscription() {
    return this.request("/subscriptions/me");
  }

  async subscribe(type: "pro" | "max") {
    return this.request("/subscriptions", { method: "POST", body: JSON.stringify({ type }) });
  }

  async cancelSubscription() {
    return this.request("/subscriptions/me/cancel", { method: "POST" });
  }

  // ── BOOSTS ────────────────────────────────────────────────────────────────
  async getActiveBoosts() {
    return this.request("/boosts/active");
  }

  async createBoost(data: { postId?: string; taskId?: string }) {
    return this.request("/boosts", { method: "POST", body: JSON.stringify(data) });
  }

  // ── ACHIEVEMENTS ──────────────────────────────────────────────────────────
  async getAchievements() {
    return this.request("/achievements");
  }

  async getUserAchievements(userId: string) {
    return this.request(`/achievements/user/${userId}`);
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  async getModerationQueue() {
    return this.request("/admin/moderation/queue");
  }

  async approvePost(postId: string) {
    return this.request(`/admin/moderation/posts/${postId}/approve`, { method: "POST" });
  }

  async rejectPost(postId: string) {
    return this.request(`/admin/moderation/posts/${postId}/reject`, { method: "POST" });
  }

  async banUser(userId: string) {
    return this.request(`/admin/users/${userId}/ban`, { method: "POST" });
  }

  async getAdminUsers() {
    return this.request("/admin/users");
  }

  async getAdminStats() {
    return this.request("/admin/stats");
  }
}

export const apiClient = new APIClient();
