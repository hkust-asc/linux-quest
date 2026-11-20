-------------------------------- MODULE VFS ---------------------------------
CONSTANT Variant
VARIABLES download, installed, alias, root, local, last

Download == "/home/cadet/downloads/diag.sh"
Installed == "/home/cadet/bin/diag.sh"
Local == "/home/cadet/workspace/local"
Empty == "absent"
Idle == [command |-> "", operand |-> "", localBefore |-> FALSE]

Init ==
  /\ download = "0644" /\ installed = Empty /\ alias = FALSE
  /\ root = TRUE /\ local = TRUE /\ last = Idle

Transfer(move) ==
  /\ download /= Empty
  /\ download' = IF move THEN Empty ELSE download
  /\ installed' = download
  /\ alias' = (~move /\ Variant = "alias")
  /\ last' = [Idle EXCEPT !.command = IF move THEN "mv" ELSE "cp", !.operand = Download]
  /\ UNCHANGED <<root, local>>

MoveDownload == Transfer(TRUE)
CopyDownload == Transfer(FALSE)

ChmodInstalled ==
  /\ installed /= Empty
  /\ installed' = "0755"
  /\ download' = IF alias THEN installed' ELSE download
  /\ last' = [Idle EXCEPT !.command = "chmod", !.operand = Installed]
  /\ UNCHANGED <<alias, root, local>>

RemoveDownload ==
  /\ download /= Empty
  /\ download' = Empty /\ alias' = FALSE
  /\ last' = [Idle EXCEPT !.command = "rm", !.operand = Download]
  /\ UNCHANGED <<installed, root, local>>

RemoveLocalAndRoot ==
  /\ local
  /\ local' = (Variant /= "root")
  /\ last' = [command |-> "rm", operand |-> "/", localBefore |-> local]
  /\ UNCHANGED <<download, installed, alias, root>>

ResetFixture ==
  /\ download' = "0644" /\ installed' = Empty /\ alias' = FALSE
  /\ root' = TRUE /\ local' = TRUE /\ last' = Idle
Next == MoveDownload \/ CopyDownload \/ ChmodInstalled \/ RemoveDownload \/ RemoveLocalAndRoot \/ ResetFixture

CopyIsolatesMetadata == download /= Empty => download = "0644"
RootRefusalHasNoSideEffects == last.operand = "/" => root /\ local = last.localBefore
=============================================================================
