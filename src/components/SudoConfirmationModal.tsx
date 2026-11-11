import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
  Platform
} from "react-native";
import {
  ShieldAlert,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  User,
  Store,
  ArrowRight,
  ShieldCheck,
  X
} from "lucide-react-native";
import {
  AdminApi,
  SudoActionType,
  SudoScopeType,
  SudoActionResult
} from "../api/adminApi";

export interface SudoTarget {
  id: string; // Auth UID or Store ID
  name: string;
  identifier: string; // Customer ID, Phone, or Store ID
  scope: SudoScopeType; // "ss" or "ssm"
  currentStatus: string;
  phone?: string;
  email?: string;
}

interface SudoConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: SudoActionResult) => void;
  target: SudoTarget | null;
  action: SudoActionType | null;
  adminEmail?: string;
  adminId?: string;
}

export const SudoConfirmationModal: React.FC<SudoConfirmationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  target,
  action,
  adminEmail = "founder@jrina.online",
  adminId = "founder_super_admin"
}) => {
  const isDark = useColorScheme() === "dark";

  const [commandInput, setCommandInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmedResult, setConfirmedResult] = useState<SudoActionResult | null>(null);

  // Compute expected command
  const expectedCommand = action && target ? `sudo ${action} ${target.scope} --admin confirm` : "";
  const isCommandExact = commandInput.trim().toLowerCase() === expectedCommand.toLowerCase();

  const isReasonRequired = action === "suspend" || action === "ban" || action === "delete";
  const isReasonValid = !isReasonRequired || reasonInput.trim().length >= 3;
  const canSubmit = isCommandExact && isReasonValid && !loading;

  // Reset inputs whenever modal opens or closes
  useEffect(() => {
    if (visible) {
      setCommandInput("");
      setReasonInput("");
      setErrorMessage(null);
      setConfirmedResult(null);
      setCopied(false);
    }
  }, [visible, action, target]);

  if (!visible || !target || !action) return null;

  const handleCopyCommand = () => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(expectedCommand);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickPasteCommand = () => {
    setCommandInput(expectedCommand);
  };

  const handleExecute = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await AdminApi.executeSudoAction({
        action,
        scope: target.scope,
        command: commandInput.trim(),
        targetId: target.id,
        reason: reasonInput.trim(),
        adminId,
        adminEmail
      });

      if (!res.success) {
        setErrorMessage(res.error || "The server rejected the SUDO authorization command.");
        return;
      }

      setConfirmedResult(res);
      onSuccess(res);
    } catch (err: any) {
      console.error("[SudoConfirmationModal] Execution error:", err);
      setErrorMessage(err?.message || "An unexpected error occurred during execution.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCommandInput("");
    setReasonInput("");
    setErrorMessage(null);
    setConfirmedResult(null);
    onClose();
  };

  // Theme styling
  const colors = isDark
    ? {
        modalOverlay: "rgba(0, 0, 0, 0.85)",
        cardBg: "#0F172A",
        cardBorder: "#1E293B",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        terminalBg: "#020617",
        terminalBorder: "#1E293B",
        inputBg: "#1E293B",
        inputBorder: "#334155",
        accent: "#EA580C"
      }
    : {
        modalOverlay: "rgba(15, 23, 42, 0.7)",
        cardBg: "#FFFFFF",
        cardBorder: "#E2E8F0",
        textMain: "#0F172A",
        textSub: "#64748B",
        terminalBg: "#0F172A",
        terminalBorder: "#1E293B",
        inputBg: "#F8FAFC",
        inputBorder: "#CBD5E1",
        accent: "#EA580C"
      };

  // Severity visual helpers
  const getActionTheme = () => {
    switch (action) {
      case "suspend":
        return {
          headerBg: "#FEF3C7",
          headerBorder: "#FDE68A",
          iconColor: "#D97706",
          badgeBg: "#FDF6B2",
          badgeText: "#92400E",
          buttonBg: "#D97706",
          title: "Account Suspension Request",
          consequence:
            "Temporarily disables account sign-in and protected services in " +
            (target.scope === "ss" ? "SSC (Consumer App)" : "SSM (Merchant App)") +
            ". All orders, profile data, and balances are preserved. Can be restored anytime."
        };
      case "ban":
        return {
          headerBg: "#FEE2E2",
          headerBorder: "#FECACA",
          iconColor: "#DC2626",
          badgeBg: "#FEE2E2",
          badgeText: "#991B1B",
          buttonBg: "#DC2626",
          title: "Administrative Ban Enforcement",
          consequence:
            "Permanently restricts authentication and service access until explicitly lifted by a Super Admin. Existing transaction records are strictly preserved."
        };
      case "delete":
        return {
          headerBg: "#FEE2E2",
          headerBorder: "#FCA5A5",
          iconColor: "#B91C1C",
          badgeBg: "#FEE2E2",
          badgeText: "#7F1D1D",
          buttonBg: "#B91C1C",
          title: "Account Soft-Deletion & Session Revocation",
          consequence:
            "Puts the account into soft-deletion and immediately revokes all active auth sessions. Critical transactions, orders, and statutory tax logs are preserved for legal and audit compliance."
        };
      case "restore":
        return {
          headerBg: "#DCFCE7",
          headerBorder: "#BBF7D0",
          iconColor: "#16A34A",
          badgeBg: "#DCFCE7",
          badgeText: "#166534",
          buttonBg: "#16A34A",
          title: "Account Restoration Authorization",
          consequence:
            "Restores a suspended account back to ACTIVE state and immediately re-enables sign-in and ecosystem service access."
        };
      case "unban":
        return {
          headerBg: "#DCFCE7",
          headerBorder: "#BBF7D0",
          iconColor: "#16A34A",
          badgeBg: "#DCFCE7",
          badgeText: "#166534",
          buttonBg: "#16A34A",
          title: "Administrative Ban Revocation",
          consequence:
            "Removes the administrative ban, unblocks authentication, and restores full ecosystem access."
        };
    }
  };

  const actionTheme = getActionTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {/* Header Bar */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.actionIconBox, { backgroundColor: actionTheme.headerBg }]}>
                <ShieldAlert size={20} color={actionTheme.iconColor} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>{actionTheme.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                  <Text style={styles.clearanceBadge}>SUPER ADMIN PRIVILEGE</Text>
                  <Text style={[styles.scopeBadge, { color: colors.textSub }]}>
                    • Scope: {target.scope === "ss" ? "SSC (Consumer)" : "SSM (Merchant)"}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <X size={20} color={colors.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* If action already confirmed, show confirmation view */}
            {confirmedResult ? (
              <View style={styles.resultBox}>
                <View style={[styles.successCircle, { backgroundColor: "#DCFCE7" }]}>
                  <CheckCircle2 size={36} color="#16A34A" />
                </View>
                <Text style={[styles.resultTitle, { color: colors.textMain }]}>SUDO Command Confirmed</Text>
                <Text style={[styles.resultSub, { color: colors.textSub }]}>
                  The server successfully executed and audited the operation.
                </Text>

                <View style={[styles.resultCard, { borderColor: colors.cardBorder, backgroundColor: colors.terminalBg }]}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Target Account:</Text>
                    <Text style={styles.resultValue}>{target.name}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Target Application:</Text>
                    <Text style={styles.resultValue}>{confirmedResult.target_app || (target.scope === "ss" ? "SSC" : "SSM")}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Transition:</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={[styles.statusTag, { color: "#94A3B8" }]}>{confirmedResult.previous_status}</Text>
                      <ArrowRight size={13} color="#94A3B8" style={{ marginHorizontal: 6 }} />
                      <Text style={[styles.statusTag, { color: "#10B981", fontWeight: "700" }]}>{confirmedResult.new_status}</Text>
                    </View>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Audit Event ID:</Text>
                    <Text style={[styles.resultValue, { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>
                      {confirmedResult.audit_id || "Recorded"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: "#16A34A", marginTop: 20 }]}
                  onPress={handleCancel}
                >
                  <Text style={styles.primaryActionText}>Done & Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Target Profile Dossier Card */}
                <View style={[styles.targetCard, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.cardBorder }]}>
                  <View style={styles.targetHeaderRow}>
                    <View style={styles.targetAvatar}>
                      {target.scope === "ss" ? (
                        <User size={18} color="#EA580C" />
                      ) : (
                        <Store size={18} color="#16A34A" />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.targetName, { color: colors.textMain }]} numberOfLines={1}>
                        {target.name}
                      </Text>
                      <Text style={[styles.targetMeta, { color: colors.textSub }]}>
                        {target.identifier} {target.phone ? `• ${target.phone}` : ""}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: actionTheme.badgeBg }]}>
                      <Text style={[styles.statusPillText, { color: actionTheme.badgeText }]}>
                        {target.currentStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Consequences Warning */}
                <View style={[styles.warningBox, { backgroundColor: actionTheme.headerBg, borderColor: actionTheme.headerBorder }]}>
                  <AlertTriangle size={18} color={actionTheme.iconColor} style={{ marginTop: 2, marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningTitle, { color: actionTheme.iconColor }]}>
                      Scope Impact Warning ({target.scope === "ss" ? "SSC Consumer" : "SSM Merchant"})
                    </Text>
                    <Text style={[styles.warningText, { color: actionTheme.iconColor }]}>
                      {actionTheme.consequence}
                    </Text>
                  </View>
                </View>

                {/* Error Banner if any */}
                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <XCircle size={16} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Reason Input (Mandatory for suspend/ban/delete) */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textMain }]}>
                    Administrative Reason {isReasonRequired ? <Text style={{ color: "#EF4444" }}>*</Text> : <Text style={{ color: colors.textSub }}>(Optional)</Text>}
                  </Text>
                  <TextInput
                    style={[styles.reasonInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMain }]}
                    placeholder={
                      action === "suspend"
                        ? "e.g. Investigation for anomalous order velocity"
                        : action === "ban"
                        ? "e.g. Fraudulent activity or policy non-compliance"
                        : action === "delete"
                        ? "e.g. User requested account erasure per privacy policy"
                        : "Optional administrative notes"
                    }
                    placeholderTextColor={colors.textSub}
                    value={reasonInput}
                    onChangeText={setReasonInput}
                    multiline
                  />
                </View>

                {/* Expected Command Box */}
                <View style={styles.inputGroup}>
                  <View style={styles.commandHeaderRow}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Terminal size={14} color="#EA580C" style={{ marginRight: 6 }} />
                      <Text style={[styles.inputLabel, { color: colors.textMain, marginBottom: 0 }]}>
                        Required SUDO Authorization Command
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity onPress={handleQuickPasteCommand} style={styles.quickFillBtn}>
                        <Text style={styles.quickFillText}>Auto-Fill</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCopyCommand} style={styles.copyBtn}>
                        {copied ? (
                          <Check size={13} color="#10B981" />
                        ) : (
                          <Copy size={13} color={colors.textSub} />
                        )}
                        <Text style={[styles.copyBtnText, { color: copied ? "#10B981" : colors.textSub }]}>
                          {copied ? "Copied" : "Copy"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.terminalBox, { backgroundColor: colors.terminalBg, borderColor: colors.terminalBorder }]}>
                    <Text selectable style={styles.terminalText}>{expectedCommand}</Text>
                  </View>
                  <Text style={[styles.instructionHint, { color: colors.textSub }]}>
                    Type or paste the exact command string above to confirm server-side authorization.
                  </Text>
                </View>

                {/* Command Confirmation Input */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMain, marginBottom: 0 }]}>
                      Confirmation Input
                    </Text>
                    {commandInput.length > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {isCommandExact ? (
                          <>
                            <CheckCircle2 size={13} color="#10B981" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 11, color: "#10B981", fontWeight: "600" }}>Command Match</Text>
                          </>
                        ) : (
                          <>
                            <XCircle size={13} color="#EF4444" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 11, color: "#EF4444", fontWeight: "600" }}>Incomplete</Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>

                  <TextInput
                    style={[
                      styles.commandInputField,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: isCommandExact ? "#10B981" : colors.inputBorder,
                        color: colors.textMain
                      }
                    ]}
                    placeholder={expectedCommand}
                    placeholderTextColor={isDark ? "#475569" : "#94A3B8"}
                    value={commandInput}
                    onChangeText={setCommandInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                </View>

                {/* Footer Buttons */}
                <View style={[styles.modalFooter, { borderTopColor: colors.cardBorder }]}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                    onPress={handleCancel}
                    disabled={loading}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSub }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.executeBtn,
                      {
                        backgroundColor: canSubmit ? actionTheme.buttonBg : isDark ? "#334155" : "#CBD5E1",
                        opacity: canSubmit ? 1 : 0.6
                      }
                    ]}
                    onPress={handleExecute}
                    disabled={!canSubmit}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <ShieldCheck size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.executeBtnText}>Execute SUDO {action.toUpperCase()}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalContainer: {
    width: "100%",
    maxWidth: 580,
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  clearanceBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EA580C",
    letterSpacing: 0.5
  },
  scopeBadge: {
    fontSize: 11,
    marginLeft: 6
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8
  },
  scrollArea: {
    padding: 20
  },
  targetCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  targetHeaderRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  targetAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FED7AA",
    justifyContent: "center",
    alignItems: "center"
  },
  targetName: {
    fontSize: 14,
    fontWeight: "700"
  },
  targetMeta: {
    fontSize: 12,
    marginTop: 2
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700"
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    marginBottom: 16
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    marginBottom: 16
  },
  errorBannerText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
    flex: 1
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: "top"
  },
  commandHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  quickFillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#EA580C20",
    marginRight: 6
  },
  quickFillText: {
    color: "#EA580C",
    fontSize: 11,
    fontWeight: "600"
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#64748B15"
  },
  copyBtnText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: "600"
  },
  terminalBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12
  },
  terminalText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "600"
  },
  instructionHint: {
    fontSize: 11,
    marginTop: 4
  },
  commandInputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600"
  },
  executeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  executeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  resultBox: {
    alignItems: "center",
    paddingVertical: 20
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4
  },
  resultSub: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20
  },
  resultCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B"
  },
  resultLabel: {
    fontSize: 12,
    color: "#94A3B8"
  },
  resultValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F8FAFC"
  },
  statusTag: {
    fontSize: 12
  },
  primaryActionBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  }
});
