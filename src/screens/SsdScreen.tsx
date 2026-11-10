import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Linking
} from "react-native";
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  ShieldAlert,
  Check,
  X,
  RefreshCw
} from "lucide-react-native";
import { AdminApi, SsdApplication } from "../api/adminApi";

interface SsdScreenProps {
  isDark?: boolean;
}

export const SsdScreen: React.FC<SsdScreenProps> = ({ isDark = false }) => {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [applications, setApplications] = useState<SsdApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Verification document viewer modal state
  const [selectedApp, setSelectedApp] = useState<SsdApplication | null>(null);

  const colors = isDark
    ? {
        bg: "#0B0F17",
        cardBg: "#161E2E",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        border: "#1E293B",
        tabActiveBg: "#EA580C",
        tabActiveText: "#FFFFFF",
        tabInactiveBg: "#1E293B",
        tabInactiveText: "#94A3B8",
        badgePendingBg: "#451A03",
        badgePendingText: "#FBBF24",
        badgeApprovedBg: "#064E3B",
        badgeApprovedText: "#34D399",
        badgeRejectedBg: "#450A0A",
        badgeRejectedText: "#F87171",
        accent: "#EA580C"
      }
    : {
        bg: "#F8FAFC",
        cardBg: "#FFFFFF",
        textMain: "#0F172A",
        textSub: "#64748B",
        border: "#E2E8F0",
        tabActiveBg: "#EA580C",
        tabActiveText: "#FFFFFF",
        tabInactiveBg: "#F1F5F9",
        tabInactiveText: "#64748B",
        badgePendingBg: "#FEF3C7",
        badgePendingText: "#D97706",
        badgeApprovedBg: "#ECFDF5",
        badgeApprovedText: "#059669",
        badgeRejectedBg: "#FEE2E2",
        badgeRejectedText: "#DC2626",
        accent: "#EA580C"
      };

  const loadApplications = async (reset = false) => {
    if (reset) setLoading(true);

    try {
      const res = await AdminApi.getDeliveryApplications(activeTab, 1, 30);
      setApplications(res.applications);
      setTotal(res.total);
    } catch (err) {
      console.warn("Failed to load applications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadApplications(true);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadApplications(true);
  };

  const handleUpdateStatus = async (appId: string, status: "approved" | "rejected") => {
    setProcessingId(appId);
    try {
      const ok = await AdminApi.updateDeliveryApplicationStatus(appId, status);
      if (ok) {
        // Update local state instantly for optimal UX
        setApplications((prev) =>
          prev.map((app) => (app.id === appId ? { ...app, status } : app))
        );
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp(null);
        }
      }
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: SsdApplication }) => {
    const isPending = item.status === "pending";
    const isApproved = item.status === "approved";
    const isRejected = item.status === "rejected";

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? "#1E293B" : "#FAF5FF" }]}>
              <Truck size={20} color="#9333EA" />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.applicantName, { color: colors.textMain }]}>{item.fullName}</Text>
              <View style={styles.metaRow}>
                <Phone size={11} color={colors.textSub} style={{ marginRight: 3 }} />
                <Text style={[styles.metaText, { color: colors.textSub }]}>{item.phone}</Text>
                <Text style={[styles.dot, { color: colors.textSub }]}>•</Text>
                <MapPin size={11} color={colors.textSub} style={{ marginRight: 3 }} />
                <Text style={[styles.metaText, { color: colors.textSub }]}>{item.state}</Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isPending
                  ? colors.badgePendingBg
                  : isApproved
                  ? colors.badgeApprovedBg
                  : colors.badgeRejectedBg
              }
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isPending
                    ? colors.badgePendingText
                    : isApproved
                    ? colors.badgeApprovedText
                    : colors.badgeRejectedText
                }
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.vehicleInfoRow, { backgroundColor: isDark ? "#121926" : "#F8FAFC" }]}>
          <View style={styles.vehicleCol}>
            <Text style={[styles.vLabel, { color: colors.textSub }]}>Vehicle Details</Text>
            <Text style={[styles.vValue, { color: colors.textMain }]}>
              {item.vehicleType} • {item.vehicleNumber}
            </Text>
          </View>
          <View style={styles.vehicleCol}>
            <Text style={[styles.vLabel, { color: colors.textSub }]}>Driving Licence</Text>
            <Text style={[styles.vValue, { color: colors.textMain }]}>{item.drivingLicenceNumber}</Text>
          </View>
        </View>

        {/* Verification Documents & Action Bar */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.docBtn, { borderColor: colors.border }]}
            onPress={() => setSelectedApp(item)}
            activeOpacity={0.7}
          >
            <FileText size={14} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={styles.docBtnText}>Verify Documents</Text>
          </TouchableOpacity>

          {isPending && (
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                style={[styles.rejectBtn, processingId === item.id && { opacity: 0.5 }]}
                onPress={() => handleUpdateStatus(item.id, "rejected")}
                disabled={processingId === item.id}
                activeOpacity={0.7}
              >
                <X size={14} color="#DC2626" style={{ marginRight: 3 }} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.approveBtn, processingId === item.id && { opacity: 0.5 }]}
                onPress={() => handleUpdateStatus(item.id, "approved")}
                disabled={processingId === item.id}
                activeOpacity={0.7}
              >
                <Check size={14} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isPending && (
            <View style={styles.reviewedRow}>
              <Clock size={12} color={colors.textSub} style={{ marginRight: 4 }} />
              <Text style={[styles.reviewedText, { color: colors.textSub }]}>
                {item.reviewedAt ? `Reviewed ${item.reviewedAt}` : `Applied ${item.createdAt}`}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.headerBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>
            SSD – Partner Approvals
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSub }]}>
            Delivery application review console • Total: {total}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshIconBtn, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}
          onPress={() => loadApplications(true)}
          activeOpacity={0.7}
        >
          <RefreshCw size={15} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["pending", "approved", "rejected", "all"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: isActive ? colors.tabActiveBg : colors.tabInactiveBg
                }
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.tabActiveText : colors.tabInactiveText,
                    fontWeight: isActive ? "800" : "600"
                  }
                ]}
              >
                {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Loading applications...</Text>
        </View>
      ) : applications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Truck size={40} color={colors.textSub} style={{ opacity: 0.5, marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
            {activeTab === "all" ? "No applications found" : `No ${activeTab} applications`}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSub }]}>
            Applications submitted via SSD mobile app appear here automatically
          </Text>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        />
      )}

      {/* Document Review Modal */}
      {selectedApp && (
        <Modal
          visible={!!selectedApp}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedApp(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                    Verification Documents
                  </Text>
                  <Text style={[styles.modalSub, { color: colors.textSub }]}>
                    {selectedApp.fullName} • Ref: {selectedApp.id.slice(0, 8)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedApp(null)} style={styles.modalCloseBtn}>
                  <X size={18} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalDocList}>
                <View style={[styles.docItem, { borderColor: colors.border }]}>
                  <Text style={[styles.docName, { color: colors.textMain }]}>Driving Licence</Text>
                  {selectedApp.documents.drivingLicence ? (
                    <TouchableOpacity
                      style={styles.viewDocLink}
                      onPress={() => Linking.openURL(selectedApp.documents.drivingLicence!)}
                    >
                      <ExternalLink size={14} color="#2563EB" style={{ marginRight: 4 }} />
                      <Text style={styles.viewDocLinkText}>View File</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.noDocText, { color: colors.textSub }]}>Not Uploaded</Text>
                  )}
                </View>

                <View style={[styles.docItem, { borderColor: colors.border }]}>
                  <Text style={[styles.docName, { color: colors.textMain }]}>RC Book / Registration</Text>
                  {selectedApp.documents.rcBook ? (
                    <TouchableOpacity
                      style={styles.viewDocLink}
                      onPress={() => Linking.openURL(selectedApp.documents.rcBook!)}
                    >
                      <ExternalLink size={14} color="#2563EB" style={{ marginRight: 4 }} />
                      <Text style={styles.viewDocLinkText}>View File</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.noDocText, { color: colors.textSub }]}>Not Uploaded</Text>
                  )}
                </View>

                <View style={[styles.docItem, { borderColor: colors.border }]}>
                  <Text style={[styles.docName, { color: colors.textMain }]}>Vehicle Photograph</Text>
                  {selectedApp.documents.vehiclePhoto ? (
                    <TouchableOpacity
                      style={styles.viewDocLink}
                      onPress={() => Linking.openURL(selectedApp.documents.vehiclePhoto!)}
                    >
                      <ExternalLink size={14} color="#2563EB" style={{ marginRight: 4 }} />
                      <Text style={styles.viewDocLinkText}>View File</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.noDocText, { color: colors.textSub }]}>Not Uploaded</Text>
                  )}
                </View>
              </View>

              {selectedApp.status === "pending" && (
                <View style={styles.modalFooterActions}>
                  <TouchableOpacity
                    style={styles.modalRejectBtn}
                    onPress={() => handleUpdateStatus(selectedApp.id, "rejected")}
                  >
                    <X size={15} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={styles.modalRejectText}>Reject Application</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalApproveBtn}
                    onPress={() => handleUpdateStatus(selectedApp.id, "approved")}
                  >
                    <Check size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.modalApproveText}>Approve Partner</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20
  },
  tabText: {
    fontSize: 12
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden"
  },
  cardHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  applicantName: {
    fontSize: 15,
    fontWeight: "800"
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2
  },
  metaText: {
    fontSize: 11
  },
  dot: {
    marginHorizontal: 5
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  vehicleInfoRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  vehicleCol: {
    flex: 1
  },
  vLabel: {
    fontSize: 10,
    fontWeight: "600"
  },
  vValue: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1
  },
  cardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  docBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1
  },
  docBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB"
  },
  actionButtonGroup: {
    flexDirection: "row",
    gap: 8
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626"
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  reviewedRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  reviewedText: {
    fontSize: 11,
    fontStyle: "italic"
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
    fontWeight: "600"
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 6
  },
  modalDocList: {
    marginBottom: 20
  },
  docItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  docName: {
    fontSize: 13,
    fontWeight: "600"
  },
  viewDocLink: {
    flexDirection: "row",
    alignItems: "center"
  },
  viewDocLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB"
  },
  noDocText: {
    fontSize: 12,
    fontStyle: "italic"
  },
  modalFooterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12
  },
  modalRejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#FEE2E2"
  },
  modalRejectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626"
  },
  modalApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#16A34A"
  },
  modalApproveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
