import React from "react";

type Props = {
  checked: boolean;
  onChange: () => void;
};

export default function ToggleSwitch({ checked, onChange }: Props) {
  return (
    <label style={{ position: "relative", display: "inline-block", width: "60px", height: "30px" }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />

      <span
        style={{
          position: "absolute",
          cursor: "pointer",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: checked ? "#00BFFF" : "#444",
          borderRadius: "30px",
          transition: "0.3s",
        }}
      ></span>

      <span
        style={{
          position: "absolute",
          top: "4px",
          left: checked ? "33px" : "5px",
          width: "22px",
          height: "22px",
          backgroundColor: "white",
          borderRadius: "50%",
          transition: "0.3s",
        }}
      ></span>
    </label>
  );
}
