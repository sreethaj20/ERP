/**
 * Interview Panel Service
 * Centralized API client for all interview panel operations across roles:
 * HR, Team Leader, Manager, Recruiter
 */

import api from '../api/apiClient';

export interface InterviewRecord {
    id: number;
    interview_id?: number;
    candidate_id: string;
    candidate_name?: string;
    job_id: string;
    job_title?: string;
    round_number: number;
    interview_type: string;
    interview_mode: string;
    interview_date: string;
    interview_time?: string;
    duration_minutes?: number;
    meeting_link?: string;
    interviewer_id?: string;
    interviewer_names?: string;
    status: string;
    result?: string;
    feedback?: string;
    overall_rating?: number;
    created_at: string;
    updated_at?: string;
}

export interface ScorecardPayload {
    feedback: string;
    overall_rating: number;
    result: string;            // pass | fail | hold
    technical_score?: number;
    communication_score?: number;
    problem_solving_score?: number;
    culture_fit_score?: number;
    status?: string;           // Completed
}

// --- Fetchers ---

/** HR: All scheduled interviews (full visibility) */
export const getAllInterviews = async (): Promise<InterviewRecord[]> => {
    const res = await api.get('hr/interviews');
    return res.data || [];
};

/** HR: Only interviews personally assigned to the logged-in HR user */
export const getMyPanelInterviews = async (): Promise<InterviewRecord[]> => {
    try {
        const res = await api.get('hr/interviews/my-panel');
        return res.data || [];
    } catch (err: any) {
        if (err?.response?.status === 404) {
            console.warn('[interviewPanelService] /hr/interviews/my-panel returned 404. Falling back to client-side filtering on /hr/interviews');
            try {
                const all = await getAllInterviews();
                const empId = sessionStorage.getItem('employeeId') || '';
                return all.filter((i: InterviewRecord) => String(i.interviewer_id) === String(empId));
            } catch {
                return [];
            }
        }
        throw err;
    }
};

/** Team Leader: Interviews assigned to them */
export const getTLPanelInterviews = async (): Promise<InterviewRecord[]> => {
    const res = await api.get('recruiter/interviews');
    const empId = sessionStorage.getItem('employeeId') || '';
    return (res.data || []).filter((i: InterviewRecord) => String(i.interviewer_id) === String(empId));
};

/** Manager: All interviews (oversight) */
export const getManagerInterviews = async (): Promise<InterviewRecord[]> => {
    const res = await api.get('manager/interviews');
    return res.data || [];
};

/** Recruiter: All interviews across all rounds */
export const getRecruiterInterviews = async (): Promise<InterviewRecord[]> => {
    const res = await api.get('recruiter/interviews');
    return res.data || [];
};

// --- Mutations ---

/**
 * Submit scorecard feedback for a given interview round.
 * Works for HR and Recruiter-side panels.
 */
export const submitHRScorecard = async (
    interviewId: number,
    payload: ScorecardPayload
): Promise<InterviewRecord> => {
    const res = await api.patch(`hr/interviews/${interviewId}/feedback`, payload);
    return res.data;
};

export const submitRecruiterScorecard = async (
    interviewId: number,
    payload: ScorecardPayload
): Promise<InterviewRecord> => {
    const res = await api.patch(`recruiter/interviews/${interviewId}/feedback`, payload);
    return res.data;
};

/** Schedule a new interview round */
export const scheduleInterviewRound = async (payload: any): Promise<InterviewRecord> => {
    const res = await api.post('recruiter/interviews', payload);
    return res.data;
};

/** Update candidate pipeline stage */
export const updateCandidatePipelineStage = async (
    candidateId: string,
    stage: string
): Promise<void> => {
    await api.patch(`recruiter/candidates/${candidateId}/stage`, null, { params: { stage } });
};
