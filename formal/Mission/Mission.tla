------------------------------ MODULE Mission ------------------------------
CONSTANT Variant
VARIABLES level, revealed, tokenRead, download, installed, executable, cwd, last, complete
vars == <<level, revealed, tokenRead, download, installed, executable, cwd, last, complete>>

Workspace == "/home/cadet/workspace"
AccessKey == "/home/cadet/workspace/.vault/.access_key"
Bin == "/home/cadet/bin"
Download == "/home/cadet/downloads/diag.sh"
Installed == "/home/cadet/bin/diag.sh"
Idle == [name |-> "", path |-> "", output |-> "", launchDownload |-> "", awarded |-> FALSE]
Success == "Diagnostic passed: simulated node is ready."

Init ==
  /\ level = 1 /\ revealed = FALSE /\ tokenRead = FALSE
  /\ download = "" /\ installed = "absent" /\ executable = FALSE
  /\ cwd = Workspace /\ last = Idle /\ complete = FALSE

RevealWorkspace ==
  /\ level = 1
  /\ revealed' = TRUE
  /\ UNCHANGED <<level, tokenRead, download, installed, executable, cwd, last, complete>>

ReadTokenAt(path) ==
  /\ level = 1 /\ path = AccessKey
  /\ tokenRead' = (tokenRead \/ revealed \/ Variant = "reveal")
  /\ UNCHANGED <<level, revealed, download, installed, executable, cwd, last, complete>>

ReadToken == ReadTokenAt(AccessKey)

SelectMission02 ==
  /\ level = 1 /\ tokenRead
  /\ level' = 2 /\ download' = Download /\ revealed' = FALSE
  /\ UNCHANGED <<tokenRead, installed, executable, cwd, last, complete>>

Transfer(move) ==
  /\ level = 2 /\ download = Download
  /\ installed' = IF move THEN "moved" ELSE "copied"
  /\ download' = IF move THEN "" ELSE Download
  /\ executable' = FALSE /\ last' = Idle
  /\ UNCHANGED <<level, revealed, tokenRead, cwd, complete>>

MoveDownload == Transfer(TRUE)
CopyDownload == Transfer(FALSE)

RemoveDownload ==
  /\ level = 2 /\ download = Download
  /\ download' = "" /\ last' = Idle
  /\ UNCHANGED <<level, revealed, tokenRead, installed, executable, cwd, complete>>

SetExecuteBit ==
  /\ level = 2 /\ installed /= "absent"
  /\ executable' = TRUE /\ last' = Idle
  /\ UNCHANGED <<level, revealed, tokenRead, download, installed, cwd, complete>>

OverwriteWithEcho ==
  /\ level = 2 /\ installed /= "absent"
  /\ installed' = "echo only" /\ last' = Idle
  /\ UNCHANGED <<level, revealed, tokenRead, download, executable, cwd, complete>>

ChangeDirectory(target) ==
  /\ level = 2
  /\ cwd' = target /\ last' = Idle
  /\ UNCHANGED <<level, revealed, tokenRead, download, installed, executable, complete>>

ChangeToBin == ChangeDirectory(Bin)
ChangeToWorkspace == ChangeDirectory(Workspace)

DiagnosticContent == installed \in {"moved", "copied"}
Relative(command) == command \in {"./diag.sh", "./../bin/diag.sh"}
Qualified(event) ==
  /\ event.output = Success /\ event.path = Installed /\ Relative(event.name)
  /\ cwd = Bin /\ executable /\ event.launchDownload = "" /\ DiagnosticContent

RunDiagnostic(command, launchDownload, finalDownload) ==
  LET sourced == command = "source ~/bin/diag.sh"
      direct == installed /= "absent" /\ executable /\ ~sourced
      output == IF direct \/ (installed /= "absent" /\ sourced) THEN Success ELSE ""
      base == [name |-> command, path |-> IF direct THEN Installed ELSE "", output |-> output,
               launchDownload |-> launchDownload, awarded |-> FALSE]
      observedDownload == IF Variant = "pipeline" THEN finalDownload ELSE launchDownload
      accept == output = Success /\ direct /\ Relative(command) /\ cwd = Bin
                /\ (observedDownload = "" \/ Variant = "leftover")
                /\ (DiagnosticContent \/ Variant = "content")
                /\ (installed = "moved" \/ Variant /= "identity")
  IN /\ level = 2
     /\ last' = [base EXCEPT !.awarded = accept /\ ~complete]
     /\ complete' = (complete \/ accept)
     /\ download' = finalDownload
     /\ UNCHANGED <<level, revealed, tokenRead, installed, executable, cwd>>

LaunchRelative ==
  RunDiagnostic(IF cwd = Bin THEN "./diag.sh" ELSE "./../bin/diag.sh", download, download)
LaunchAbsolute == RunDiagnostic(Installed, download, download)
SourceDiagnostic == RunDiagnostic("source ~/bin/diag.sh", download, download)

LaunchThenRemove ==
  /\ cwd = Bin /\ download = Download
  /\ RunDiagnostic("./diag.sh", download, "")

RemoveThenLaunch ==
  /\ cwd = Bin /\ download = Download
  /\ RunDiagnostic("./diag.sh", "", "")

Next ==
  \/ RevealWorkspace \/ ReadToken \/ SelectMission02
  \/ MoveDownload \/ CopyDownload \/ RemoveDownload \/ SetExecuteBit
  \/ OverwriteWithEcho \/ ChangeToBin \/ ChangeToWorkspace
  \/ LaunchRelative \/ LaunchAbsolute \/ SourceDiagnostic
  \/ LaunchThenRemove \/ RemoveThenLaunch

RevealBeforeRead == level = 1 /\ tokenRead => revealed
InstallSoundness == last.awarded => Qualified(last)
InstallResponsiveness == Qualified(last) => complete
=============================================================================
