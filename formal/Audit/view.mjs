export const title = "Mission 06 proposal review";
const stages = ["Review recursive deletion", "Review login-node benchmark", "Review scheduler submission", "Review complete"];
const expected = ["reject", "reject", "approve"];

export function state(current) {
  if (current.dispatched) return "Proposal dispatched";
  if (expected.slice(0, current.proposalIndex).some((verdict, index) => current.accepted[index + 1] !== verdict)) {
    return "Incorrect decision advanced review";
  }
  return stages[current.proposalIndex];
}

export function step(action, before, after) {
  if (action === "Decide") {
    const verdict = after.proposalIndex > before.proposalIndex
      ? after.accepted[after.proposalIndex]
      : expected[before.proposalIndex] === "approve" ? "reject" : "approve";
    return verdict === "approve" ? "choose Approve" : "choose Reject";
  }
  return { Reject: "choose Reject", Approve: "choose Approve", ReselectMission06: "reselect Mission 06" }[action];
}
