import React, { useState } from "react";
import { createOffer } from "../../utils/recruiterStorage";

export default function OfferRelease() {
  const [form, setForm] = useState({
    candidate_id: "",
    salary_offered: "",
    joining_date: "",
  });

  const release = () => {
    createOffer({
      ...form,
      offer_status: "sent",
    });
    alert("Offer Released");
  };

  return (
    <div>
      <h2>Release Offer</h2>
      <input placeholder="Candidate ID" onChange={(e) => setForm({ ...form, candidate_id: e.target.value })} />
      <input placeholder="Salary Offered" onChange={(e) => setForm({ ...form, salary_offered: e.target.value })} />
      <input type="date" onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
      <button onClick={release}>Send Offer</button>
    </div>
  );
}
