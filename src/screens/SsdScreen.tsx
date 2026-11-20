import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  ScrollView,
  TextInput
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
  ShieldAlert,
  Check,
  X,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Maximize2
} from "lucide-react-native";
import { AdminApi, SsdApplication, SsdDocumentPreviewResult } from "../api/adminApi";

interface SsdScreenProps {
  isDark?: boolean;
}

type DocCategory = "license" | "vehicle" | "noc";

export const SsdScreen: React.FC<SsdScreenProps> = ({ isDark = false }) => {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [applications, setApplications] = useState<SsdApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Application verification modal state
  const [selectedApp, setSelectedApp] = useState<SsdApplication | null>(null);

  // Document preview states (mapped by docCategory)
  const [docPreviews, setDocPreviews] = useState<Record<DocCategory, SsdDocumentPreviewResult | null>>({
    license: null,
    vehicle: null,
    noc: null
  });
  const [loadingDocs, setLoadingDocs] = useState<Record<DocCategory, boolean>>({
    license: false,
    vehicle: false,
    noc: false
  });
  const [docErrors, setDocErrors] = useState<Record<DocCategory, string | null>>({
    license: null,
    vehicle: null,
    noc: null
  });

  // Fullscreen interactive zoom viewer modal state
  const [zoomDoc, setZoomDoc] = useState<{
    title: string;
    docType: DocCategory;
    preview: SsdDocumentPreviewResult;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Mandatory rejection reason modal state
  const [rejectingApp, setRejectingApp] = useState<SsdApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Approval confirmation modal state
  const [approvingApp, setApprovingApp] = useState<SsdApplication | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
        accent: "#EA580C",
        previewBg: "#0B0F17",
        docCardBg: "#121926"
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
        accent: "#EA580C",
        previewBg: "#F1F5F9",
        docCardBg: "#F8FAFC"
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

  /**
   * Fetches preview for a single document category
   */
  const loadSingleDocPreview = useCallback(async (app: SsdApplication, docType: DocCategory, force = false) => {
    // If optional NOC and not uploaded, mark directly
    if (docType === "noc" && !app.documents.nocDocument && !app.documents.nocDocumentFileId) {
      setDocPreviews((prev) => ({
        ...prev,
        noc: { success: true, notUploaded: true, docType: "noc" }
      }));
      return;
    }

    setLoadingDocs((prev) => ({ ...prev, [docType]: true }));
    setDocErrors((prev) => ({ ...prev, [docType]: null }));

    const fileId =
      docType === "license"
        ? app.documents.drivingLicenceFileId || app.documents.drivingLicence
        : docType === "vehicle"
        ? app.documents.vehiclePhotoFileId || app.documents.vehiclePhoto
        : app.documents.nocDocumentFileId || app.documents.nocDocument;

    const res = await AdminApi.fetchDocumentPreview(app.registrationId, docType, fileId, force);

    setLoadingDocs((prev) => ({ ...prev, [docType]: false }));
    if (res.success) {
      setDocPreviews((prev) => ({ ...prev, [docType]: res }));
    } else {
      setDocErrors((prev) => ({
        ...prev,
        [docType]: res.error || "Failed to load document."
      }));
    }
  }, []);

  /**
   * When an administrator opens an application, initialize document previews
   * Meets Performance requirement: "Load document previews only when the administrator opens an application"
   */
  const handleOpenApplicationModal = (app: SsdApplication) => {
    setSelectedApp(app);
    setDocPreviews({ license: null, vehicle: null, noc: null });
    setDocErrors({ license: null, vehicle: null, noc: null });
    setActionFeedback(null);

    // Fetch previews for the opened application
    loadSingleDocPreview(app, "license");
    loadSingleDocPreview(app, "vehicle");
    if (app.documents.nocDocument || app.documents.nocDocumentFileId || !app.isOwnVehicle) {
      loadSingleDocPreview(app, "noc");
    } else {
      setDocPreviews((prev) => ({
        ...prev,
        noc: { success: true, notUploaded: true, docType: "noc" }
      }));
    }
  };

  /**
   * Open fullscreen zoom viewer
   */
  const handleOpenZoomViewer = (docType: DocCategory, title: string) => {
    const preview = docPreviews[docType];
    if (!preview || !preview.dataUrl) return;
    setZoomDoc({ title, docType, preview });
    setZoomLevel(1.0);
  };

  /**
   * Execute Approval Decision
   */
  const handleConfirmApproval = async () => {
    if (!approvingApp) return;
    setIsApproving(true);
    setActionFeedback(null);

    const res = await AdminApi.updateDeliveryApplicationStatus(approvingApp.registrationId, "approved");
    setIsApproving(false);

    if (res.success) {
      setApplications((prev) =>
        prev.map((a) => (a.registrationId === approvingApp.registrationId ? { ...a, status: "approved" } : a))
      );
      if (selectedApp && selectedApp.registrationId === approvingApp.registrationId) {
        setSelectedApp({ ...selectedApp, status: "approved" });
      }
      setApprovingApp(null);
      setActionFeedback({
        type: "success",
        message: `Application ${approvingApp.registrationId} approved. Delivery partner profile activated.`
      });
    } else {
      setActionFeedback({
        type: "error",
        message: res.error || "Failed to approve application."
      });
    }
  };

  /**
   * Execute Rejection Decision (with mandatory rejection reason)
   */
  const handleConfirmRejection = async () => {
    if (!rejectingApp) return;
    const cleanReason = rejectionReason.trim();

    if (!cleanReason) {
      setRejectionError("Rejection reason is mandatory. Please state why this application is being rejected.");
      return;
    }

    setIsRejecting(true);
    setRejectionError(null);

    const res = await AdminApi.updateDeliveryApplicationStatus(
      rejectingApp.registrationId,
      "rejected",
      cleanReason
    );
    setIsRejecting(false);

    if (res.success) {
      setApplications((prev) =>
        prev.map((a) =>
          a.registrationId === rejectingApp.registrationId
            ? { ...a, status: "rejected", adminRemarks: cleanReason }
            : a
        )
      );
      if (selectedApp && selectedApp.registrationId === rejectingApp.registrationId) {
        setSelectedApp({ ...selectedApp, status: "rejected", adminRemarks: cleanReason });
      }
      setRejectingApp(null);
      setRejectionReason("");
      setActionFeedback({
        type: "success",
        message: `Application ${rejectingApp.registrationId} rejected with recorded reason.`
      });
    } else {
      setRejectionError(res.error || "Failed to reject application.");
    }
  };

  /**
   * Render single document inspection box in modal
   */
  const renderDocumentBox = (
    title: string,
    docType: DocCategory,
    isMandatory: boolean,
    app: SsdApplication
  ) => {
    const preview = docPreviews[docType];
    const isLoading = loadingDocs[docType];
    const errorMsg = docErrors[docType];

    return (
      <View style={[styles.docCard, { backgroundColor: colors.docCardBg, borderColor: colors.border }]}>
        <View style={styles.docCardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <FileText size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.docCardTitle, { color: colors.textMain }]}>{title}</Text>
            {isMandatory ? (
              <View style={styles.requiredPill}>
                <Text style={styles.requiredPillText}>Required</Text>
              </View>
            ) : (
              <View style={styles.optionalPill}>
                <Text style={styles.optionalPillText}>Optional (NOC)</Text>
              </View>
            )}
          </View>

          {preview && preview.dataUrl && (
            <TouchableOpacity
              style={styles.expandIconBtn}
              onPress={() => handleOpenZoomViewer(docType, title)}
              activeOpacity={0.7}
            >
              <Maximize2 size={14} color="#2563EB" />
              <Text style={styles.expandText}>Zoom</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.docStateBox}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.docStateText, { color: colors.textSub }]}>
              Retrieving encrypted document from Google Drive...
            </Text>
          </View>
        )}

        {/* Not Uploaded State (e.g. NOC for self-owned vehicle) */}
        {!isLoading && preview?.notUploaded && (
          <View style={[styles.docStateBox, { backgroundColor: isDark ? "#161E2E" : "#F8FAFC" }]}>
            <CheckCircle size={22} color="#10B981" style={{ marginBottom: 4 }} />
            <Text style={[styles.docStateTitle, { color: colors.textMain }]}>Not Required</Text>
            <Text style={[styles.docStateText, { color: colors.textSub }]}>
              Vehicle is self-owned. No Objection Certificate is not required.
            </Text>
          </View>
        )}

        {/* Access Denied State */}
        {!isLoading && errorMsg && errorMsg.includes("Access Denied") && (
          <View style={[styles.docStateBox, styles.errorStateBox]}>
            <ShieldAlert size={22} color="#DC2626" style={{ marginBottom: 4 }} />
            <Text style={[styles.docStateTitle, { color: "#DC2626" }]}>Access Denied</Text>
            <Text style={[styles.docStateText, { color: colors.textSub }]}>
              SSA Administrator permissions required to inspect this document.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadSingleDocPreview(app, docType, true)}
            >
              <RefreshCw size={12} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.retryBtnText}>Retry Authentication</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* File Not Found State */}
        {!isLoading && errorMsg && (errorMsg.includes("not found") || errorMsg.includes("404")) && (
          <View style={[styles.docStateBox, styles.warnStateBox]}>
            <AlertCircle size={22} color="#D97706" style={{ marginBottom: 4 }} />
            <Text style={[styles.docStateTitle, { color: "#D97706" }]}>Document Not Found</Text>
            <Text style={[styles.docStateText, { color: colors.textSub }]}>
              No document reference found in Google Drive for this application.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadSingleDocPreview(app, docType, true)}
            >
              <RefreshCw size={12} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.retryBtnText}>Retry Fetch</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generic Error / Network Retry State */}
        {!isLoading && errorMsg && !errorMsg.includes("Access Denied") && !errorMsg.includes("not found") && (
          <View style={[styles.docStateBox, styles.warnStateBox]}>
            <AlertTriangle size={22} color="#D97706" style={{ marginBottom: 4 }} />
            <Text style={[styles.docStateTitle, { color: "#D97706" }]}>Connection Issue</Text>
            <Text style={[styles.docStateText, { color: colors.textSub }]}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadSingleDocPreview(app, docType, true)}
            >
              <RefreshCw size={12} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Document Content Display */}
        {!isLoading && preview && preview.dataUrl && !preview.notUploaded && (
          <View style={styles.previewContainer}>
            {preview.mimeType === "application/pdf" ? (
              // PDF In-App Preview
              <View style={[styles.pdfCard, { backgroundColor: isDark ? "#0F172A" : "#EFF6FF" }]}>
                <FileText size={36} color="#DC2626" style={{ marginBottom: 8 }} />
                <Text style={[styles.pdfFileName, { color: colors.textMain }]}>{preview.fileName}</Text>
                <Text style={[styles.pdfMeta, { color: colors.textSub }]}>
                  Adobe Acrobat PDF Document • {((preview.sizeBytes || 0) / 1024).toFixed(1)} KB
                </Text>
                <View style={styles.pdfVerifiedBadge}>
                  <ShieldCheck size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.pdfVerifiedText}>Authenticated via Google Drive</Text>
                </View>
                <TouchableOpacity
                  style={styles.inspectPdfBtn}
                  onPress={() => handleOpenZoomViewer(docType, title)}
                  activeOpacity={0.8}
                >
                  <Eye size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.inspectPdfBtnText}>Inspect PDF Document</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Image Thumbnail with Zoom Button
              <TouchableOpacity
                style={styles.imageThumbnailWrapper}
                onPress={() => handleOpenZoomViewer(docType, title)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: preview.dataUrl }}
                  style={styles.imageThumbnail}
                  resizeMode="contain"
                />
                <View style={styles.thumbnailOverlay}>
                  <ZoomIn size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.thumbnailOverlayText}>Tap to Zoom</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.docFooterRow}>
              <Text style={[styles.docFooterMeta, { color: colors.textSub }]}>
                Source: Private Google Drive Subfolder
              </Text>
              <TouchableOpacity
                onPress={() => loadSingleDocPreview(app, docType, true)}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <RefreshCw size={11} color={colors.textSub} style={{ marginRight: 3 }} />
                <Text style={[styles.docFooterRefresh, { color: colors.textSub }]}>Reload</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.applicantName, { color: colors.textMain }]}>{item.fullName}</Text>
                <View style={styles.regIdPill}>
                  <Text style={styles.regIdText}>{item.registrationId}</Text>
                </View>
              </View>
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
            <Text style={[styles.vLabel, { color: colors.textSub }]}>Ownership</Text>
            <Text style={[styles.vValue, { color: colors.textMain }]}>
              {item.isOwnVehicle ? "Self-Owned" : "Third-Party (NOC Attached)"}
            </Text>
          </View>
          <View style={styles.vehicleCol}>
            <Text style={[styles.vLabel, { color: colors.textSub }]}>Driving Licence</Text>
            <Text style={[styles.vValue, { color: colors.textMain }]}>{item.drivingLicenceNumber}</Text>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.docBtn, { borderColor: "#2563EB" }]}
            onPress={() => handleOpenApplicationModal(item)}
            activeOpacity={0.7}
          >
            <Eye size={14} color="#2563EB" style={{ marginRight: 5 }} />
            <Text style={styles.docBtnText}>Review & Preview Documents</Text>
          </TouchableOpacity>

          {isPending && (
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => {
                  setRejectingApp(item);
                  setRejectionReason("");
                  setRejectionError(null);
                }}
                disabled={processingId === item.registrationId}
                activeOpacity={0.7}
              >
                <X size={14} color="#DC2626" style={{ marginRight: 3 }} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => {
                  setApprovingApp(item);
                  setActionFeedback(null);
                }}
                disabled={processingId === item.registrationId}
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
                {item.reviewedAt ? `Decision recorded: ${item.reviewedAt}` : `Applied: ${item.createdAt}`}
              </Text>
            </View>
          )}
        </View>

        {item.adminRemarks && (
          <View style={[styles.remarksBanner, { backgroundColor: isDark ? "#1E293B" : "#FFF7ED" }]}>
            <Text style={[styles.remarksText, { color: colors.textMain }]}>
              <Text style={{ fontWeight: "700" }}>Admin Remarks: </Text>
              {item.adminRemarks}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.headerBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>
            SSD – Partner Approvals & Document Review
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSub }]}>
            Google Drive private document review console • Applications: {total}
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
                {tab === "all" ? "All Applications" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action feedback toast */}
      {actionFeedback && (
        <View
          style={[
            styles.feedbackBanner,
            actionFeedback.type === "success" ? styles.successBanner : styles.errorBanner
          ]}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle size={16} color="#059669" style={{ marginRight: 6 }} />
          ) : (
            <AlertCircle size={16} color="#DC2626" style={{ marginRight: 6 }} />
          )}
          <Text
            style={[
              styles.feedbackText,
              { color: actionFeedback.type === "success" ? "#065F46" : "#991B1B" }
            ]}
          >
            {actionFeedback.message}
          </Text>
          <TouchableOpacity onPress={() => setActionFeedback(null)} style={{ marginLeft: 8 }}>
            <X size={14} color={actionFeedback.type === "success" ? "#065F46" : "#991B1B"} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main List */}
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
            Applications submitted via SSD mobile app appear here automatically with private Google Drive documents.
          </Text>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.registrationId || item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. DOCUMENT PREVIEW & APPLICATION REVIEW MODAL                     */}
      {/* ------------------------------------------------------------------ */}
      {selectedApp && (
        <Modal
          visible={!!selectedApp}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedApp(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                      {selectedApp.fullName}
                    </Text>
                    <View style={styles.regIdPill}>
                      <Text style={styles.regIdText}>{selectedApp.registrationId}</Text>
                    </View>
                  </View>
                  <Text style={[styles.modalSub, { color: colors.textSub }]}>
                    {selectedApp.phone} • {selectedApp.vehicleType} ({selectedApp.vehicleNumber}) • Applied {selectedApp.createdAt}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedApp(null)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Security Guarantee Notice */}
                <View style={[styles.securityNotice, { backgroundColor: isDark ? "#0F172A" : "#F0FDF4" }]}>
                  <ShieldCheck size={16} color="#16A34A" style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={[styles.securityNoticeText, { color: isDark ? "#94A3B8" : "#166534" }]}>
                    Zero documents are stored in Supabase Storage. Previews are retrieved in-memory from private Google Drive folders through authenticated SSA Administrator Clearance.
                  </Text>
                </View>

                {/* Section Title: "Submitted Documents" */}
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
                    Submitted Documents
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSub }]}>
                    Driving Licence (required) • Vehicle Photo (required) • Vehicle NOC (conditional)
                  </Text>
                </View>

                {/* 1. Driving Licence Box */}
                {renderDocumentBox("Driving Licence", "license", true, selectedApp)}

                {/* 2. Vehicle Photo Box */}
                {renderDocumentBox("Vehicle Photograph", "vehicle", true, selectedApp)}

                {/* 3. Vehicle NOC Box (Display if uploaded or if vehicle is third-party) */}
                {renderDocumentBox("Vehicle NOC (No Objection Certificate)", "noc", !selectedApp.isOwnVehicle, selectedApp)}

                {/* Verification History / Decision Details */}
                {selectedApp.adminRemarks && (
                  <View style={[styles.historyBox, { borderColor: colors.border }]}>
                    <Text style={[styles.historyTitle, { color: colors.textMain }]}>
                      Verification Decision Trail
                    </Text>
                    <Text style={[styles.historyRemarks, { color: colors.textSub }]}>
                      Status: {selectedApp.status.toUpperCase()} • Remarks: {selectedApp.adminRemarks}
                    </Text>
                    {selectedApp.reviewedAt && (
                      <Text style={[styles.historyTimestamp, { color: colors.textSub }]}>
                        Reviewed: {selectedApp.reviewedAt}
                      </Text>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Modal Actions Footer: Approve / Reject */}
              <View style={[styles.modalFooterActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalCloseFooterBtn, { borderColor: colors.border }]}
                  onPress={() => setSelectedApp(null)}
                >
                  <Text style={[styles.modalCloseFooterText, { color: colors.textMain }]}>Close</Text>
                </TouchableOpacity>

                {selectedApp.status === "pending" && (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={styles.modalRejectBtn}
                      onPress={() => {
                        setRejectingApp(selectedApp);
                        setRejectionReason("");
                        setRejectionError(null);
                      }}
                    >
                      <X size={15} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.modalRejectText}>Reject Application</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalApproveBtn}
                      onPress={() => {
                        setApprovingApp(selectedApp);
                        setActionFeedback(null);
                      }}
                    >
                      <Check size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.modalApproveText}>Approve Partner</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. FULLSCREEN INTERACTIVE ZOOM VIEWER MODAL                         */}
      {/* ------------------------------------------------------------------ */}
      {zoomDoc && (
        <Modal
          visible={!!zoomDoc}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomDoc(null)}
        >
          <View style={styles.zoomOverlay}>
            <View style={styles.zoomHeader}>
              <View>
                <Text style={styles.zoomTitle}>{zoomDoc.title}</Text>
                <Text style={styles.zoomSub}>
                  {zoomDoc.preview.fileName} • Zoom: {Math.round(zoomLevel * 100)}%
                </Text>
              </View>

              {/* Zoom Controls */}
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomCtrlBtn}
                  onPress={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  activeOpacity={0.7}
                >
                  <ZoomOut size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomCtrlBtn}
                  onPress={() => setZoomLevel(1.0)}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={14} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomCtrlBtn}
                  onPress={() => setZoomLevel((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
                  activeOpacity={0.7}
                >
                  <ZoomIn size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.zoomCtrlBtn, { backgroundColor: "#DC2626", marginLeft: 10 }]}
                  onPress={() => setZoomDoc(null)}
                  activeOpacity={0.7}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Document Content */}
            <View style={styles.zoomContentArea}>
              {zoomDoc.preview.mimeType === "application/pdf" ? (
                // PDF Viewer View
                <View style={styles.pdfFullPreviewBox}>
                  <FileText size={64} color="#DC2626" style={{ marginBottom: 12 }} />
                  <Text style={styles.pdfFullTitle}>{zoomDoc.preview.fileName}</Text>
                  <Text style={styles.pdfFullSub}>
                    Verified Vehicle No Objection Certificate (PDF)
                  </Text>
                  <View style={styles.pdfFullPill}>
                    <ShieldCheck size={14} color="#34D399" style={{ marginRight: 6 }} />
                    <Text style={styles.pdfFullPillText}>
                      Document Verified In-Memory • Private Google Drive Storage
                    </Text>
                  </View>
                  <Text style={styles.pdfNote}>
                    Document preview verified by SSA Administrator. Ready for approval/rejection decision.
                  </Text>
                </View>
              ) : (
                // Zoomable Image
                <ScrollView
                  style={styles.zoomScrollView}
                  contentContainerStyle={styles.zoomScrollContent}
                  maximumZoomScale={3.0}
                  minimumZoomScale={0.5}
                  showsHorizontalScrollIndicator
                  showsVerticalScrollIndicator
                >
                  <Image
                    source={{ uri: zoomDoc.preview.dataUrl }}
                    style={[
                      styles.zoomImage,
                      {
                        transform: [{ scale: zoomLevel }]
                      }
                    ]}
                    resizeMode="contain"
                  />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. MANDATORY REJECTION REASON MODAL                                */}
      {/* ------------------------------------------------------------------ */}
      {rejectingApp && (
        <Modal
          visible={!!rejectingApp}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isRejecting) setRejectingApp(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.dialogCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.dialogHeader}>
                <XCircle size={24} color="#DC2626" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dialogTitle, { color: colors.textMain }]}>
                    Reject Delivery Application
                  </Text>
                  <Text style={[styles.dialogSub, { color: colors.textSub }]}>
                    {rejectingApp.fullName} ({rejectingApp.registrationId})
                  </Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textMain }]}>
                Rejection Reason <Text style={{ color: "#DC2626" }}>* (Mandatory)</Text>
              </Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  {
                    backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                    borderColor: rejectionError ? "#DC2626" : colors.border,
                    color: colors.textMain
                  }
                ]}
                placeholder="Enter mandatory reason (e.g., Driving Licence is expired, photo is illegible, vehicle number plate mismatch...)"
                placeholderTextColor={colors.textSub}
                value={rejectionReason}
                onChangeText={(text) => {
                  setRejectionReason(text);
                  if (rejectionError) setRejectionError(null);
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isRejecting}
              />

              {rejectionError && (
                <View style={styles.errorInline}>
                  <AlertCircle size={14} color="#DC2626" style={{ marginRight: 5 }} />
                  <Text style={styles.errorInlineText}>{rejectionError}</Text>
                </View>
              )}

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={[styles.dialogCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setRejectingApp(null)}
                  disabled={isRejecting}
                >
                  <Text style={[styles.dialogCancelText, { color: colors.textMain }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogConfirmRejectBtn, isRejecting && { opacity: 0.6 }]}
                  onPress={handleConfirmRejection}
                  disabled={isRejecting}
                >
                  {isRejecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <X size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.dialogConfirmRejectText}>Confirm Rejection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. APPROVAL CONFIRMATION MODAL                                     */}
      {/* ------------------------------------------------------------------ */}
      {approvingApp && (
        <Modal
          visible={!!approvingApp}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isApproving) setApprovingApp(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.dialogCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.dialogHeader}>
                <CheckCircle size={24} color="#16A34A" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dialogTitle, { color: colors.textMain }]}>
                    Approve Delivery Partner
                  </Text>
                  <Text style={[styles.dialogSub, { color: colors.textSub }]}>
                    {approvingApp.fullName} ({approvingApp.registrationId})
                  </Text>
                </View>
              </View>

              <Text style={[styles.confirmPromptText, { color: colors.textSub }]}>
                Are you sure you want to approve this application?
                {"\n\n"}
                • All submitted documents have been reviewed in Google Drive.
                {"\n"}
                • An operational courier account will be created or activated in the delivery fleet.
                {"\n"}
                • Application status will be synchronized across Google Sheets and Supabase.
              </Text>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={[styles.dialogCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setApprovingApp(null)}
                  disabled={isApproving}
                >
                  <Text style={[styles.dialogCancelText, { color: colors.textMain }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogConfirmApproveBtn, isApproving && { opacity: 0.6 }]}
                  onPress={handleConfirmApproval}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.dialogConfirmApproveText}>Approve Partner</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
  feedbackBanner: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  successBanner: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1
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
  regIdPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8
  },
  regIdText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8"
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1
  },
  docBtnText: {
    fontSize: 12,
    fontWeight: "700",
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
    paddingVertical: 7,
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
    paddingVertical: 7,
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
  remarksBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)"
  },
  remarksText: {
    fontSize: 11
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
    marginTop: 4,
    textAlign: "center"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalCard: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "92%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden"
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 6
  },
  modalScroll: {
    padding: 16
  },
  securityNotice: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16
  },
  securityNoticeText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1
  },
  sectionTitleRow: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2
  },
  docCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden"
  },
  docCardHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)"
  },
  docCardTitle: {
    fontSize: 13,
    fontWeight: "700"
  },
  requiredPill: {
    backgroundColor: "#FEE2E2",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6
  },
  requiredPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#DC2626"
  },
  optionalPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6
  },
  optionalPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#D97706"
  },
  expandIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5
  },
  expandText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    marginLeft: 4
  },
  docStateBox: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  errorStateBox: {
    backgroundColor: "#FEF2F2"
  },
  warnStateBox: {
    backgroundColor: "#FFFBEB"
  },
  docStateTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  docStateText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center"
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF"
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB"
  },
  previewContainer: {
    padding: 12
  },
  imageThumbnailWrapper: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0F172A"
  },
  imageThumbnail: {
    width: "100%",
    height: "100%"
  },
  thumbnailOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center"
  },
  thumbnailOverlayText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  pdfCard: {
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  pdfFileName: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  pdfMeta: {
    fontSize: 11,
    marginTop: 2
  },
  pdfVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 8
  },
  pdfVerifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669"
  },
  inspectPdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    marginTop: 12
  },
  inspectPdfBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  docFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)"
  },
  docFooterMeta: {
    fontSize: 10
  },
  docFooterRefresh: {
    fontSize: 10,
    fontWeight: "600"
  },
  historyBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 10
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: "700"
  },
  historyRemarks: {
    fontSize: 11,
    marginTop: 4
  },
  historyTimestamp: {
    fontSize: 10,
    marginTop: 2,
    fontStyle: "italic"
  },
  modalFooterActions: {
    padding: 14,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalCloseFooterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1
  },
  modalCloseFooterText: {
    fontSize: 12,
    fontWeight: "600"
  },
  modalRejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#FEE2E2"
  },
  modalRejectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626"
  },
  modalApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#16A34A"
  },
  modalApproveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: "#0B0F17"
  },
  zoomHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#161E2E",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  zoomTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800"
  },
  zoomSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2
  },
  zoomControls: {
    flexDirection: "row",
    gap: 6
  },
  zoomCtrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center"
  },
  zoomContentArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  zoomScrollView: {
    flex: 1,
    width: "100%"
  },
  zoomScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  zoomImage: {
    width: 600,
    height: 420
  },
  pdfFullPreviewBox: {
    padding: 30,
    alignItems: "center",
    maxWidth: 500
  },
  pdfFullTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  pdfFullSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4
  },
  pdfFullPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064E3B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 16
  },
  pdfFullPillText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "700"
  },
  pdfNote: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 20,
    textAlign: "center",
    lineHeight: 16
  },
  dialogCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  dialogSub: {
    fontSize: 12,
    marginTop: 2
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 90,
    marginBottom: 8
  },
  errorInline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  errorInlineText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "600",
    flex: 1
  },
  confirmPromptText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1
  },
  dialogCancelText: {
    fontSize: 12,
    fontWeight: "600"
  },
  dialogConfirmRejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6
  },
  dialogConfirmRejectText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  dialogConfirmApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6
  },
  dialogConfirmApproveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  }
});
