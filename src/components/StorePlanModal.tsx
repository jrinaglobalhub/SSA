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
  Crown,
  Sparkles,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  Store,
  Calendar,
  X,
  CreditCard,
  Clock,
  ArrowRight
} from "lucide-react-native";
import {
  AdminApi,
  SsmMerchant,
  StorePlanType,
  OverrideStorePlanResult
} from "../api/adminApi";

interface DurationOption {
  days: number;
  label: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { days: 30, label: "1 Month" },
  { days: 90, label: "3 Months" },
  { days: 180, label: "6 Months" },
  { days: 365, label: "1 Year" },
  { days: 0, label: "Lifetime" }
];

interface StorePlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: OverrideStorePlanResult) => void;
  store: SsmMerchant | null;
  adminEmail?: string;
  adminId?: string;
}

export const StorePlanModal: React.FC<StorePlanModalProps> = ({
  visible,
  onClose,
  onSuccess,
  store,
  adminEmail = "founder@jrina.online",
  adminId = "founder_super_admin"
}) => {
  const isDark = useColorScheme() === "dark";

  const [selectedPlan, setSelectedPlan] = useState<StorePlanType>("PRO");
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DURATION_OPTIONS[0]);
  const [commandInput, setCommandInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmedResult, setConfirmedResult] = useState<OverrideStorePlanResult | null>(null);

  const EXPECTED_COMMAND = "sudo ssm confirm";
  const isCommandExact = commandInput.trim().toLowerCase() === EXPECTED_COMMAND;
  const canSubmit = isCommandExact && !loading;

  // Sync state on open
  useEffect(() => {
    if (visible && store) {
      const current = (store.subscriptionPlan || "FREE").toUpperCase();
      if (current === "PREMIUM") {
        setSelectedPlan("PREMIUM");
      } else if (current === "PRO" || current.startsWith("PRO_")) {
        setSelectedPlan("PRO");
      } else {
        setSelectedPlan("PRO"); // Default recommendation
      }
      setSelectedDuration(DURATION_OPTIONS[0]);
      setCommandInput("");
      setReasonInput("");
      setErrorMessage(null);
      setConfirmedResult(null);
      setCopied(false);
    }
  }, [visible, store]);

  if (!visible || !store) return null;

  const handleCopyCommand = () => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(EXPECTED_COMMAND);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate live preview of expiration
  const calculateExpiryPreview = () => {
    if (selectedPlan === "FREE" || selectedDuration.days <= 0) {
      return "Lifetime / Perpetual (Never Expires)";
    }
    const exp = new Date(Date.now() + selectedDuration.days * 24 * 60 * 60 * 1000);
    return exp.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }) + ` (${selectedDuration.label})`;
  };

  const handleActivatePlan = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setErrorMessage(null);

    const result = await AdminApi.overrideStorePlan({
      storeId: store.id,
      plan: selectedPlan,
      durationDays: selectedPlan === "FREE" ? 0 : selectedDuration.days,
      durationLabel: selectedPlan === "FREE" ? "Standard" : selectedDuration.label,
      command: commandInput.trim(),
      reason: reasonInput.trim() || undefined,
      adminId,
      adminEmail
    });

    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || "Failed to activate plan.");
      return;
    }

    setConfirmedResult(result);
    onSuccess(result);
  };

  const colors = {
    modalBg: isDark ? "#0F172A" : "#FFFFFF",
    cardBg: isDark ? "#1E293B" : "#F8FAFC",
    border: isDark ? "#334155" : "#E2E8F0",
    textMain: isDark ? "#F8FAFC" : "#0F172A",
    textSub: isDark ? "#94A3B8" : "#64748B",
    inputBg: isDark ? "#0B1220" : "#F1F5F9"
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View style={styles.iconCircle}>
                <Crown size={20} color="#7C3AED" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.headerTitle, { color: colors.textMain }]}>Manage Store Plan</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSub }]}>Manual Plan Override & Validity</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={loading}>
              <X size={18} color={colors.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
            {confirmedResult ? (
              /* Success State */
              <View style={styles.successState}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={48} color="#16A34A" />
                </View>
                <Text style={[styles.successTitle, { color: colors.textMain }]}>Plan Activated Successfully!</Text>
                <Text style={[styles.successSubtitle, { color: colors.textSub }]}>
                  {confirmedResult.message || `Store plan updated to ${confirmedResult.subscriptionPlan}`}
                </Text>

                <View style={[styles.resultCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSub }]}>Store:</Text>
                    <Text style={[styles.resultValue, { color: colors.textMain }]}>{confirmedResult.storeName}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSub }]}>Active Plan:</Text>
                    <View style={styles.activePlanPill}>
                      <Text style={styles.activePlanPillText}>{confirmedResult.subscriptionPlan}</Text>
                    </View>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSub }]}>Validity:</Text>
                    <Text style={[styles.resultValue, { color: "#16A34A", fontWeight: "600" }]}>
                      {confirmedResult.durationLabel || "Active"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#16A34A", marginTop: 20 }]}
                  onPress={onClose}
                >
                  <Text style={styles.actionBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Store Info Card */}
                <View style={[styles.storeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Store size={18} color="#16A34A" style={{ marginRight: 8 }} />
                    <Text style={[styles.storeCardName, { color: colors.textMain }]} numberOfLines={1}>
                      {store.storeName}
                    </Text>
                  </View>
                  <View style={styles.storeCardMeta}>
                    <Text style={[styles.storeCardId, { color: colors.textSub }]}>ID: {store.id}</Text>
                    <Text style={[styles.dot, { color: colors.textSub }]}>•</Text>
                    <Text style={[styles.storeCardId, { color: colors.textSub }]}>Phone: {store.phone}</Text>
                  </View>
                  <View style={[styles.currentPlanRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.currentPlanLabel, { color: colors.textSub }]}>Current Plan:</Text>
                    <View style={styles.currentPlanBadge}>
                      <CreditCard size={11} color="#EA580C" style={{ marginRight: 4 }} />
                      <Text style={styles.currentPlanBadgeText}>{store.subscriptionPlan}</Text>
                    </View>
                    <Text style={[styles.currentExpiryText, { color: colors.textSub }]}>
                      ({store.subscriptionExpiry || "Active"})
                    </Text>
                  </View>
                </View>

                {/* Plan Selection Section */}
                <Text style={[styles.sectionTitle, { color: colors.textMain }]}>1. Select Target Plan</Text>
                <View style={styles.plansContainer}>
                  {/* FREE Plan */}
                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                      selectedPlan === "FREE" && styles.planOptionSelectedFree
                    ]}
                    onPress={() => setSelectedPlan("FREE")}
                  >
                    <View style={styles.planHeader}>
                      <Text style={[styles.planTitle, { color: colors.textMain }]}>FREE</Text>
                      {selectedPlan === "FREE" && <Check size={16} color="#16A34A" />}
                    </View>
                    <Text style={[styles.planSubtitle, { color: colors.textSub }]}>Basic Store Listing</Text>
                    <Text style={[styles.planDesc, { color: colors.textSub }]}>Standard catalog and basic search</Text>
                  </TouchableOpacity>

                  {/* PRO Plan */}
                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                      selectedPlan === "PRO" && styles.planOptionSelectedPro
                    ]}
                    onPress={() => setSelectedPlan("PRO")}
                  >
                    <View style={styles.planHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Sparkles size={14} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={[styles.planTitle, { color: "#2563EB" }]}>PRO</Text>
                      </View>
                      {selectedPlan === "PRO" && <Check size={16} color="#2563EB" />}
                    </View>
                    <Text style={[styles.planSubtitle, { color: colors.textSub }]}>Featured Merchant</Text>
                    <Text style={[styles.planDesc, { color: colors.textSub }]}>Priority search & deals broadcast</Text>
                  </TouchableOpacity>

                  {/* PREMIUM Plan */}
                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                      selectedPlan === "PREMIUM" && styles.planOptionSelectedPremium
                    ]}
                    onPress={() => setSelectedPlan("PREMIUM")}
                  >
                    <View style={styles.planHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Crown size={14} color="#7C3AED" style={{ marginRight: 4 }} />
                        <Text style={[styles.planTitle, { color: "#7C3AED" }]}>PREMIUM</Text>
                      </View>
                      {selectedPlan === "PREMIUM" && <Check size={16} color="#7C3AED" />}
                    </View>
                    <Text style={[styles.planSubtitle, { color: colors.textSub }]}>Elite Enterprise</Text>
                    <Text style={[styles.planDesc, { color: colors.textSub }]}>Top banner slots & maximum radar</Text>
                  </TouchableOpacity>
                </View>

                {/* Duration Selection (for PRO & PREMIUM) */}
                {selectedPlan !== "FREE" ? (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.textMain, marginTop: 16 }]}>
                      2. Select Plan Duration
                    </Text>
                    <View style={styles.durationsRow}>
                      {DURATION_OPTIONS.map((opt) => {
                        const isSelected = selectedDuration.days === opt.days;
                        return (
                          <TouchableOpacity
                            key={opt.label}
                            style={[
                              styles.durationPill,
                              { backgroundColor: colors.cardBg, borderColor: colors.border },
                              isSelected && styles.durationPillSelected
                            ]}
                            onPress={() => setSelectedDuration(opt)}
                          >
                            <Clock size={12} color={isSelected ? "#FFFFFF" : colors.textSub} style={{ marginRight: 4 }} />
                            <Text style={[styles.durationPillText, isSelected && styles.durationPillTextSelected]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {/* Live Validity Preview */}
                <View style={[styles.previewCard, { backgroundColor: isDark ? "#0B132B" : "#F0FDF4", borderColor: isDark ? "#1E3A8A" : "#BBF7D0" }]}>
                  <Calendar size={14} color="#16A34A" style={{ marginRight: 6 }} />
                  <Text style={[styles.previewText, { color: isDark ? "#93C5FD" : "#166534" }]}>
                    Validity Preview: <Text style={{ fontWeight: "700" }}>{calculateExpiryPreview()}</Text>
                  </Text>
                </View>

                {/* SUDO Security Command Gate */}
                <View style={[styles.sudoBox, { backgroundColor: isDark ? "#18181B" : "#FFF7ED", borderColor: isDark ? "#3F3F46" : "#FED7AA" }]}>
                  <View style={styles.sudoBoxHeader}>
                    <Terminal size={15} color="#EA580C" style={{ marginRight: 6 }} />
                    <Text style={styles.sudoBoxTitle}>SUDO Confirmation Required</Text>
                  </View>
                  <Text style={[styles.sudoBoxHint, { color: isDark ? "#A1A1AA" : "#7C2D12" }]}>
                    To activate the <Text style={{ fontWeight: "700" }}>{selectedPlan}</Text> plan for this store, type the exact command below:
                  </Text>

                  <View style={styles.commandSnippet}>
                    <Text style={styles.commandCode}>{EXPECTED_COMMAND}</Text>
                    <TouchableOpacity onPress={handleCopyCommand} style={styles.copyBtn}>
                      {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} color="#EA580C" />}
                      <Text style={[styles.copyBtnText, copied && { color: "#16A34A" }]}>
                        {copied ? "Copied" : "Copy"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.commandInputRow}>
                    <Terminal size={14} color={isCommandExact ? "#16A34A" : "#EA580C"} style={{ marginRight: 6 }} />
                    <TextInput
                      style={[
                        styles.commandInput,
                        {
                          backgroundColor: colors.inputBg,
                          color: colors.textMain,
                          borderColor: isCommandExact ? "#16A34A" : commandInput.length > 0 ? "#DC2626" : colors.border
                        }
                      ]}
                      value={commandInput}
                      onChangeText={setCommandInput}
                      placeholder="sudo ssm confirm"
                      placeholderTextColor={colors.textSub}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {isCommandExact ? (
                    <Text style={styles.commandValidText}>✓ Security command verified</Text>
                  ) : commandInput.length > 0 ? (
                    <Text style={styles.commandInvalidText}>Command mismatch. Type exact: sudo ssm confirm</Text>
                  ) : null}
                </View>

                {/* Optional Reason / Notes */}
                <Text style={[styles.sectionTitle, { color: colors.textMain, marginTop: 12 }]}>
                  Admin Remarks (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.remarksInput,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.textMain,
                      borderColor: colors.border
                    }
                  ]}
                  value={reasonInput}
                  onChangeText={setReasonInput}
                  placeholder="e.g. Offline cash payment received, Promotional upgrade..."
                  placeholderTextColor={colors.textSub}
                />

                {errorMessage && (
                  <View style={styles.errorBox}>
                    <ShieldAlert size={14} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Footer Buttons */}
                <View style={styles.footerRow}>
                  <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose} disabled={loading}>
                    <Text style={[styles.cancelBtnText, { color: colors.textSub }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: canSubmit ? "#7C3AED" : isDark ? "#334155" : "#E2E8F0"
                      }
                    ]}
                    onPress={handleActivatePlan}
                    disabled={!canSubmit}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Crown size={16} color={canSubmit ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
                        <Text style={[styles.actionBtnText, !canSubmit && { color: colors.textSub }]}>
                          Activate {selectedPlan} Plan
                        </Text>
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalBox: {
    width: "100%",
    maxWidth: 580,
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700"
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16
  },
  storeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16
  },
  storeCardName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1
  },
  storeCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  storeCardId: {
    fontSize: 12
  },
  dot: {
    marginHorizontal: 6,
    fontSize: 12
  },
  currentPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1
  },
  currentPlanLabel: {
    fontSize: 12,
    marginRight: 6
  },
  currentPlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6
  },
  currentPlanBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C"
  },
  currentExpiryText: {
    fontSize: 11,
    fontStyle: "italic"
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8
  },
  plansContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  planOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5
  },
  planOptionSelectedFree: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4"
  },
  planOptionSelectedPro: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF"
  },
  planOptionSelectedPremium: {
    borderColor: "#7C3AED",
    backgroundColor: "#F5F3FF"
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  planTitle: {
    fontSize: 14,
    fontWeight: "800"
  },
  planSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4
  },
  planDesc: {
    fontSize: 10,
    marginTop: 4,
    lineHeight: 13
  },
  durationsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  durationPillSelected: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED"
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569"
  },
  durationPillTextSelected: {
    color: "#FFFFFF"
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14
  },
  previewText: {
    fontSize: 12,
    fontWeight: "500"
  },
  sudoBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14
  },
  sudoBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  sudoBoxTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EA580C"
  },
  sudoBoxHint: {
    fontSize: 12,
    marginBottom: 8
  },
  commandSnippet: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10
  },
  commandCode: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981"
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27272A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EA580C",
    marginLeft: 4
  },
  commandInputRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  commandInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13
  },
  commandValidText: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 4,
    marginLeft: 20
  },
  commandInvalidText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 4,
    marginLeft: 20
  },
  remarksInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 14
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    flex: 1
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600"
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  successState: {
    alignItems: "center",
    paddingVertical: 20
  },
  successIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20
  },
  resultCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  resultLabel: {
    fontSize: 12
  },
  resultValue: {
    fontSize: 13,
    fontWeight: "600"
  },
  activePlanPill: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6
  },
  activePlanPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  }
});
