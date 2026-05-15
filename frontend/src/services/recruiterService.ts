import api from "../api/apiClient";

export const getDashboard = async () => {
    const response = await api.get("recruiter/dashboard");
    return response.data;
};

// --- Jobs ---
export const getJobs = async () => {
    const response = await api.get("recruiter/jobs");
    return response.data;
};

export const createJob = async (jobData: any) => {
    const response = await api.post("recruiter/jobs", jobData);
    return response.data;
};

export const updateJob = async (jobId: string, jobData: any) => {
    const response = await api.put(`recruiter/jobs/${jobId}`, jobData);
    return response.data;
};

// --- Candidates ---
export const getCandidates = async () => {
    const response = await api.get("recruiter/candidates");
    return response.data;
};

export const addCandidate = async (candidateData: any) => {
    const response = await api.post("recruiter/candidates", candidateData);
    return response.data;
};

export const updateCandidateStage = async (candidateId: string, stage: string) => {
    const response = await api.patch(`recruiter/candidates/${candidateId}/stage?stage=${stage}`);
    return response.data;
};

// --- Interviews ---
export const getInterviews = async () => {
    const response = await api.get("recruiter/interviews");
    return response.data;
};

export const scheduleInterview = async (interviewData: any) => {
    const response = await api.post("recruiter/interviews", interviewData);
    return response.data;
};

export const updateInterviewFeedback = async (id: number, feedback: string, rating?: number) => {
    const response = await api.patch(`recruiter/interviews/${id}/feedback`, { feedback, rating });
    return response.data;
};

// --- Screening ---
export const getScreeningLogs = async (candidateId?: string) => {
    const response = await api.get("recruiter/screening_logs", {
        params: { candidate_id: candidateId }
    });
    return response.data;
};

export const addScreeningLog = async (logData: any) => {
    const response = await api.post("recruiter/screening_logs", logData);
    return response.data;
};

// --- Offers ---
export const getOffers = async () => {
    const response = await api.get("recruiter/offers");
    return response.data;
};

export const createOffer = async (offerData: any) => {
    const response = await api.post("recruiter/offers", offerData);
    return response.data;
};

export const updateOfferStatus = async (offerId: string, status: string, reason?: string) => {
    const response = await api.patch(`recruiter/offers/${offerId}/status`, null, {
        params: { status, reason }
    });
    return response.data;
};

export const acceptOffer = async (offerId: string, updateData?: any) => {
    const response = await api.post(`recruiter/offers/${offerId}/accept`, updateData);
    return response.data;
};

export const rejectOffer = async (offerId: string, reason: string) => {
    const response = await api.post(`recruiter/offers/${offerId}/reject`, {
        rejection_reason: reason,
    });
    return response.data;
};

export const deleteCandidate = async (candidateId: string) => {
    const response = await api.delete(`recruiter/candidates/${candidateId}`);
    return response.data;
};

export const deleteJob = async (jobId: string) => {
    const response = await api.delete(`recruiter/jobs/${jobId}`);
    return response.data;
};
