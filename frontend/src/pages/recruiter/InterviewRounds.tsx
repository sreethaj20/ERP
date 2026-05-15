import React, { useState } from "react";
import { createInterview } from "../../utils/recruiterStorage";

export default function InterviewRounds() {
  const [form, setForm] = useState({
    candidate_id: "",
    round_number: "",
    interviewer_id: "",
    interview_date: "",
  });

  const schedule = () => {
    createInterview({
      ...form,
      rating: 0,
      feedback: "",
      result: "pending",
    });
    alert("Interview Scheduled");
  };

  return (
    <div>
      <h2>Interview Scheduling</h2>
      <input placeholder="Candidate ID" onChange={(e)=>setForm({...form,candidate_id:e.target.value})}/>
      <input placeholder="Round Number" onChange={(e)=>setForm({...form,round_number:e.target.value})}/>
      <input placeholder="Interviewer ID" onChange={(e)=>setForm({...form,interviewer_id:e.target.value})}/>
      <input type="date" onChange={(e)=>setForm({...form,interview_date:e.target.value})}/>
      <button onClick={schedule}>Schedule Interview</button>
    </div>
  );
}
