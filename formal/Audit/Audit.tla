------------------------------- MODULE Audit --------------------------------
EXTENDS Integers, Sequences
CONSTANT Variant
VARIABLES proposalIndex, accepted, complete, dispatched

Verdicts == <<"reject", "reject", "approve">>
Init ==
  /\ proposalIndex = 0 /\ accepted = <<>> /\ complete = FALSE /\ dispatched = FALSE

Decide(verdict) ==
  /\ proposalIndex < Len(Verdicts)
  /\ LET matches == verdict = Verdicts[proposalIndex + 1]
         advances == matches \/ Variant = "advance"
     IN /\ proposalIndex' = IF advances THEN proposalIndex + 1 ELSE proposalIndex
        /\ accepted' = IF advances THEN Append(accepted, verdict) ELSE accepted
        /\ complete' = (proposalIndex' = Len(Verdicts))
        /\ dispatched' = (dispatched \/ (matches /\ verdict = "approve" /\ Variant = "execute"))

Reject == Decide("reject")
Approve == Decide("approve")

ReselectMission06 ==
  /\ proposalIndex' = IF complete THEN Len(Verdicts) ELSE 0
  /\ accepted' = IF complete THEN accepted ELSE <<>>
  /\ UNCHANGED <<complete, dispatched>>

Next == Reject \/ Approve \/ ReselectMission06

CorrectDecisionsInOrder ==
  /\ accepted = SubSeq(Verdicts, 1, proposalIndex)
  /\ complete = (proposalIndex = Len(Verdicts))
ProposalsNeverDispatched == ~dispatched
=============================================================================
