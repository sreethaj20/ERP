import React from "react";
import { getOffers, updateOfferStatus, convertToEmployee } from "../../utils/recruiterStorage";

export default function OfferTracking() {
  const offers = getOffers();

  return (
    <div>
      <h2>Offer Status Tracking</h2>
      {offers.map((o: any) => (
        <div key={o.offer_id}>
          Candidate ID: {o.candidate_id}
          Status: {o.offer_status}

          {o.offer_status === "sent" && (
            <>
              <button onClick={() => updateOfferStatus(o.offer_id, "accepted")}>
                Accept
              </button>
              <button onClick={() => updateOfferStatus(o.offer_id, "declined")}>
                Decline
              </button>
            </>
          )}

          {o.offer_status === "accepted" && (
            <button onClick={() => convertToEmployee(o.candidate_id)}>
              Create Employee & Onboarding
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
