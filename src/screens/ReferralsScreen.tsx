import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert
} from "react-native";
import {
  Share2,
  Store,
  Users,
  Search,
  RefreshCw,
  Gift,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Megaphone,
  FileText,
  Download,
  Trash2,
  Edit3,
  Eye,
  Clock,
  Calendar,
  X,
  Sparkles,
  Check,
  AlertTriangle,
  Archive,
  Phone,
  User,
  Copy,
  TrendingUp,
  ShoppingBag,
  Building2
} from "lucide-react-native";
import {
  AdminApi,
  SsmReferralItem,
  SscReferralItem,
  ReferralCampaign,
  ReferralCampaignVolunteer,
  ReferralCampaignArchive,
  VolunteerTrackingItem,
  CampaignTrackingSummary
} from "../api/adminApi";
import {
  exportCampaignToPDF,
  exportCampaignToDOCX,
  triggerFileDownload,
  formatToIST
} from "../utils/campaignExport";

interface ReferralsScreenProps {
  isDark?: boolean;
}

export const ReferralsScreen: React.FC<ReferralsScreenProps> = ({ isDark = false }) => {
  const [tab, setTab] = useState<"campaigns" | "ssm" | "ssc" | "archives">("campaigns");

  // Referral tracking data
  const [ssmReferrals, setSsmReferrals] = useState<SsmReferralItem[]>([]);
  const [sscReferrals, setSscReferrals] = useState<SscReferralItem[]>([]);

  // Campaigns data
  const [campaigns, setCampaigns] = useState<ReferralCampaign[]>([]);
  const [archives, setArchives] = useState<ReferralCampaignArchive[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Campaign Create / Edit Modal State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Campaign Form State
  const getTodayDateStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getFutureDateStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [campaignName, setCampaignName] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [campaignStartDate, setCampaignStartDate] = useState(getTodayDateStr());
  const [campaignStartTime, setCampaignStartTime] = useState("09:00");
  const [campaignEndDate, setCampaignEndDate] = useState(getFutureDateStr(7));
  const [campaignEndTime, setCampaignEndTime] = useState("18:00");
  const [volunteerCountInput, setVolunteerCountInput] = useState("5");
  const [volunteerRows, setVolunteerRows] = useState<ReferralCampaignVolunteer[]>([]);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);

  // View Details Modal State
  const [selectedViewCampaign, setSelectedViewCampaign] = useState<ReferralCampaign | null>(null);
  const [selectedViewVolunteers, setSelectedViewVolunteers] = useState<ReferralCampaignVolunteer[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Dedicated Tracking Modal State
  const [selectedTrackCampaign, setSelectedTrackCampaign] = useState<ReferralCampaign | null>(null);
  const [trackingSummary, setTrackingSummary] = useState<CampaignTrackingSummary>({
    totalVolunteers: 0,
    totalMerchants: 0,
    totalConsumers: 0,
    totalOnboarded: 0
  });
  const [trackingVolunteers, setTrackingVolunteers] = useState<VolunteerTrackingItem[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingSearch, setTrackingSearch] = useState("");

  const filteredTrackingVolunteers = trackingVolunteers.filter((v) => {
    if (!trackingSearch.trim()) return true;
    const q = trackingSearch.toLowerCase().trim();
    return (
      (v.volunteerName && v.volunteerName.toLowerCase().includes(q)) ||
      (v.referralCode && v.referralCode.toLowerCase().includes(q)) ||
      (v.mobileNumber && v.mobileNumber.toLowerCase().includes(q))
    );
  });

  // Delete Campaign Confirmation Modal State
  const [deletingCampaign, setDeletingCampaign] = useState<ReferralCampaign | null>(null);
  const [deleteVolunteers, setDeleteVolunteers] = useState<ReferralCampaignVolunteer[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const colors = isDark
    ? {
        bg: "#0B0F17",
        cardBg: "#161E2E",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        border: "#1E293B",
        inputBg: "#1E293B",
        tabActiveBg: "#EA580C",
        tabActiveText: "#FFFFFF",
        tabInactiveBg: "#1E293B",
        tabInactiveText: "#94A3B8",
        accent: "#EA580C"
      }
    : {
        bg: "#F8FAFC",
        cardBg: "#FFFFFF",
        textMain: "#0F172A",
        textSub: "#64748B",
        border: "#E2E8F0",
        inputBg: "#F1F5F9",
        tabActiveBg: "#EA580C",
        tabActiveText: "#FFFFFF",
        tabInactiveBg: "#F1F5F9",
        tabInactiveText: "#64748B",
        accent: "#EA580C"
      };

  const loadData = async (reset = false) => {
    if (reset) setLoading(true);
    try {
      const [ssmData, sscData, campsData, archData] = await Promise.all([
        AdminApi.getSsmReferrals(),
        AdminApi.getSscReferrals(),
        AdminApi.getAllReferralCampaigns(),
        AdminApi.getReferralCampaignArchives()
      ]);
      setSsmReferrals(ssmData);
      setSscReferrals(sscData);
      setCampaigns(campsData);
      setArchives(archData);
    } catch (e) {
      console.warn("Failed to load referrals data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  // Helper to adjust volunteer rows dynamically while preserving existing entries
  const adjustVolunteerRows = (count: number) => {
    const validCount = Math.max(0, count);
    setVolunteerRows((prev) => {
      if (prev.length === validCount) return prev;
      if (prev.length < validCount) {
        const added: ReferralCampaignVolunteer[] = [];
        for (let i = prev.length + 1; i <= validCount; i++) {
          added.push({
            serialNumber: i,
            volunteerName: "",
            mobileNumber: "",
            referralCode: "",
            assignedDate: null,
            assignedStartTime: null,
            assignedEndTime: null
          });
        }
        return [...prev, ...added];
      }
      return prev.slice(0, validCount);
    });
  };

  const handleVolunteerCountChange = (val: string) => {
    setVolunteerCountInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      adjustVolunteerRows(parsed);
    }
  };

  // Open Create Campaign Form
  const handleOpenNewCampaign = () => {
    setEditingCampaignId(null);
    setCampaignName("");
    setCampaignDesc("");
    setCampaignStartDate(getTodayDateStr());
    setCampaignStartTime("09:00");
    setCampaignEndDate(getFutureDateStr(7));
    setCampaignEndTime("18:00");
    setVolunteerCountInput("5");

    const initialRows: ReferralCampaignVolunteer[] = [];
    for (let i = 1; i <= 5; i++) {
      initialRows.push({
        serialNumber: i,
        volunteerName: "",
        mobileNumber: "",
        referralCode: "",
        assignedDate: null,
        assignedStartTime: null,
        assignedEndTime: null
      });
    }
    setVolunteerRows(initialRows);
    setIsCampaignModalOpen(true);
  };

  // Open Edit Campaign Form
  const handleOpenEditCampaign = async (camp: ReferralCampaign) => {
    setLoading(true);
    try {
      const res = await AdminApi.getReferralCampaignDetails(camp.id);
      if (res.success && res.campaign) {
        setEditingCampaignId(camp.id);
        setCampaignName(res.campaign.name);
        setCampaignDesc(res.campaign.description || "");
        setCampaignStartDate(res.campaign.startDate);
        setCampaignStartTime(res.campaign.startTime || "09:00");
        setCampaignEndDate(res.campaign.endDate);
        setCampaignEndTime(res.campaign.endTime || "18:00");
        setVolunteerCountInput(String(res.campaign.volunteerCount));
        setVolunteerRows(res.volunteers || []);
        setIsCampaignModalOpen(true);
      } else {
        Alert.alert("Error", res.error || "Could not load campaign details for editing.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load campaign details.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Unique Random Referral Codes for all rows
  const handleGenerateRandomCodes = async () => {
    const count = volunteerRows.length;
    if (count <= 0) {
      Alert.alert("Volunteers Needed", "Please enter a valid number of volunteers first.");
      return;
    }

    setGeneratingCodes(true);
    try {
      const codes = await AdminApi.generateUniqueReferralCodes(count, "CMP");
      if (codes && codes.length === count) {
        setVolunteerRows((prev) =>
          prev.map((row, idx) => ({
            ...row,
            referralCode: codes[idx]
          }))
        );
      } else {
        Alert.alert("Code Generation Warning", "Could not generate all codes. Please retry.");
      }
    } catch (err: any) {
      Alert.alert("Generation Error", err?.message || "Failed to generate referral codes.");
    } finally {
      setGeneratingCodes(false);
    }
  };

  // Save Campaign & Volunteers
  const handleSaveCampaign = async () => {
    // 1. Validate Campaign Info
    if (!campaignName.trim()) {
      Alert.alert("Validation Error", "Please provide a valid Campaign Name.");
      return;
    }

    const count = parseInt(volunteerCountInput, 10);
    if (isNaN(count) || count <= 0) {
      Alert.alert("Validation Error", "Number of volunteers must be a positive integer.");
      return;
    }

    // Validate dates & times
    const startIso = `${campaignStartDate}T${campaignStartTime}:00+05:30`;
    const endIso = `${campaignEndDate}T${campaignEndTime}:00+05:30`;
    const startTs = new Date(startIso).getTime();
    const endTs = new Date(endIso).getTime();

    if (isNaN(startTs) || isNaN(endTs)) {
      Alert.alert("Validation Error", "Please verify the start and end dates/times.");
      return;
    }

    if (endTs <= startTs) {
      Alert.alert("Validation Error", "Campaign End Date & Time must be later than Start Date & Time.");
      return;
    }

    // Validate volunteer details
    for (let i = 0; i < volunteerRows.length; i++) {
      const v = volunteerRows[i];
      if (!v.volunteerName || !v.volunteerName.trim()) {
        Alert.alert("Validation Error", `Please enter a name for Volunteer #${v.serialNumber}.`);
        return;
      }

      const phoneClean = v.mobileNumber ? v.mobileNumber.replace(/\D/g, "") : "";
      if (phoneClean.length < 10) {
        Alert.alert(
          "Validation Error",
          `Please enter a valid 10-digit mobile number for Volunteer #${v.serialNumber} (${v.volunteerName}).`
        );
        return;
      }

      if (!v.referralCode || !v.referralCode.trim()) {
        Alert.alert(
          "Validation Error",
          `Volunteer #${v.serialNumber} (${v.volunteerName}) is missing a referral code. Click "Generate Random Referral Codes" or enter one.`
        );
        return;
      }
    }

    // Check code uniqueness across rows
    const codeSet = new Set<string>();
    for (const v of volunteerRows) {
      const c = v.referralCode.trim().toUpperCase();
      if (codeSet.has(c)) {
        Alert.alert("Duplicate Code", `Referral code "${c}" is assigned multiple times. Codes must be unique.`);
        return;
      }
      codeSet.add(c);
    }

    setSavingCampaign(true);
    try {
      const res = await AdminApi.saveReferralCampaign(
        {
          id: editingCampaignId || undefined,
          name: campaignName.trim(),
          description: campaignDesc.trim() || undefined,
          startDate: campaignStartDate,
          startTime: campaignStartTime,
          endDate: campaignEndDate,
          endTime: campaignEndTime,
          startTimestamp: startIso,
          endTimestamp: endIso,
          volunteerCount: count,
          status: "active"
        },
        volunteerRows
      );

      if (res.success) {
        setIsCampaignModalOpen(false);
        loadData(false);
        Alert.alert("Success", "Referral Campaign saved successfully!");
      } else {
        Alert.alert("Save Error", res.error || "Failed to save referral campaign.");
      }
    } catch (e: any) {
      Alert.alert("Save Exception", e?.message || "Failed to save referral campaign.");
    } finally {
      setSavingCampaign(false);
    }
  };

  // Open View Details Modal
  const handleOpenViewDetails = async (camp: ReferralCampaign) => {
    setSelectedViewCampaign(camp);
    setLoadingDetails(true);
    try {
      const res = await AdminApi.getReferralCampaignDetails(camp.id);
      if (res.success && res.volunteers) {
        setSelectedViewVolunteers(res.volunteers);
      } else {
        setSelectedViewVolunteers([]);
      }
    } catch (e) {
      setSelectedViewVolunteers([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const copyToClipboard = (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    } catch {}
  };

  // Open Dedicated Tracking Page / Modal
  const handleOpenTracking = async (camp: ReferralCampaign) => {
    setSelectedTrackCampaign(camp);
    setLoadingTracking(true);
    setTrackingSearch("");
    try {
      const res = await AdminApi.getReferralCampaignTracking(camp.id);
      if (res.success && res.campaign) {
        setTrackingSummary(res.summary);
        setTrackingVolunteers(res.volunteers);
      } else {
        Alert.alert("Tracking Error", res.error || "Could not load campaign tracking data.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load campaign tracking.");
    } finally {
      setLoadingTracking(false);
    }
  };

  // Refresh Tracking Performance Data
  const handleRefreshTracking = async () => {
    if (!selectedTrackCampaign) return;
    setLoadingTracking(true);
    try {
      const res = await AdminApi.getReferralCampaignTracking(selectedTrackCampaign.id);
      if (res.success && res.campaign) {
        setTrackingSummary(res.summary);
        setTrackingVolunteers(res.volunteers);
      }
    } catch (e: any) {
      console.warn("Refresh tracking error:", e);
    } finally {
      setLoadingTracking(false);
    }
  };

  // Export handlers with verified tracking numbers
  const handleDownloadPDF = async (camp: ReferralCampaign) => {
    try {
      const res = await AdminApi.getReferralCampaignTracking(camp.id);
      const vols = res.success && res.volunteers ? res.volunteers : [];
      const sum = res.summary || { totalMerchants: 0, totalConsumers: 0, totalOnboarded: 0 };
      const blob = exportCampaignToPDF({
        name: camp.name,
        description: camp.description,
        startDate: camp.startDate,
        startTime: camp.startTime,
        endDate: camp.endDate,
        endTime: camp.endTime,
        volunteerCount: camp.volunteerCount,
        totalMerchants: sum.totalMerchants,
        totalConsumers: sum.totalConsumers,
        totalOnboarded: sum.totalOnboarded,
        volunteers: vols
      });
      triggerFileDownload(blob, `${camp.name.replace(/\s+/g, "_")}_Referral_Campaign_Report.pdf`);
    } catch (err: any) {
      Alert.alert("Export Error", err?.message || "Failed to generate PDF document.");
    }
  };

  const handleDownloadDOCX = async (camp: ReferralCampaign) => {
    try {
      const res = await AdminApi.getReferralCampaignTracking(camp.id);
      const vols = res.success && res.volunteers ? res.volunteers : [];
      const sum = res.summary || { totalMerchants: 0, totalConsumers: 0, totalOnboarded: 0 };
      const blob = await exportCampaignToDOCX({
        name: camp.name,
        description: camp.description,
        startDate: camp.startDate,
        startTime: camp.startTime,
        endDate: camp.endDate,
        endTime: camp.endTime,
        volunteerCount: camp.volunteerCount,
        totalMerchants: sum.totalMerchants,
        totalConsumers: sum.totalConsumers,
        totalOnboarded: sum.totalOnboarded,
        volunteers: vols
      });
      triggerFileDownload(blob, `${camp.name.replace(/\s+/g, "_")}_Referral_Campaign_Report.docx`);
    } catch (err: any) {
      Alert.alert("Export Error", err?.message || "Failed to generate DOCX document.");
    }
  };

  // Download from archive with verified numbers
  const handleDownloadArchivePDF = async (arch: ReferralCampaignArchive) => {
    try {
      const res = await AdminApi.getReferralCampaignArchiveTracking(arch.id);
      const vols = res.success && res.volunteers ? res.volunteers : (arch.volunteerData || []);
      const sum = res.summary || { totalMerchants: 0, totalConsumers: 0, totalOnboarded: 0 };
      const blob = exportCampaignToPDF({
        name: arch.name,
        description: arch.description,
        startDate: arch.startTimestamp ? arch.startTimestamp.substring(0, 10) : "",
        startTime: "09:00",
        endDate: arch.endTimestamp ? arch.endTimestamp.substring(0, 10) : "",
        endTime: "18:00",
        volunteerCount: arch.volunteerCount,
        totalMerchants: sum.totalMerchants,
        totalConsumers: sum.totalConsumers,
        totalOnboarded: sum.totalOnboarded,
        volunteers: vols
      });
      triggerFileDownload(blob, `${arch.name.replace(/\s+/g, "_")}_ARCHIVE_Report.pdf`);
    } catch (err: any) {
      Alert.alert("Export Error", err?.message || "Failed to generate archive PDF.");
    }
  };

  const handleDownloadArchiveDOCX = async (arch: ReferralCampaignArchive) => {
    try {
      const res = await AdminApi.getReferralCampaignArchiveTracking(arch.id);
      const vols = res.success && res.volunteers ? res.volunteers : (arch.volunteerData || []);
      const sum = res.summary || { totalMerchants: 0, totalConsumers: 0, totalOnboarded: 0 };
      const blob = await exportCampaignToDOCX({
        name: arch.name,
        description: arch.description,
        startDate: arch.startTimestamp ? arch.startTimestamp.substring(0, 10) : "",
        startTime: "09:00",
        endDate: arch.endTimestamp ? arch.endTimestamp.substring(0, 10) : "",
        endTime: "18:00",
        volunteerCount: arch.volunteerCount,
        totalMerchants: sum.totalMerchants,
        totalConsumers: sum.totalConsumers,
        totalOnboarded: sum.totalOnboarded,
        volunteers: vols
      });
      triggerFileDownload(blob, `${arch.name.replace(/\s+/g, "_")}_ARCHIVE_Report.docx`);
    } catch (err: any) {
      Alert.alert("Export Error", err?.message || "Failed to generate archive DOCX.");
    }
  };

  // Initiate Deletion Flow
  const handleInitiateDelete = async (camp: ReferralCampaign) => {
    setDeletingCampaign(camp);
    setIsDeleting(true);
    try {
      const res = await AdminApi.getReferralCampaignDetails(camp.id);
      if (res.success && res.volunteers) {
        setDeleteVolunteers(res.volunteers);
      }
    } catch (e) {
      setDeleteVolunteers([]);
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirm Archive & Permanent Deletion
  const handleConfirmDelete = async () => {
    if (!deletingCampaign) return;
    setIsDeleting(true);

    try {
      // 1. Generate & download export documents automatically before deletion
      try {
        const pdfBlob = exportCampaignToPDF({
          name: deletingCampaign.name,
          description: deletingCampaign.description,
          startDate: deletingCampaign.startDate,
          startTime: deletingCampaign.startTime,
          endDate: deletingCampaign.endDate,
          endTime: deletingCampaign.endTime,
          volunteerCount: deletingCampaign.volunteerCount,
          volunteers: deleteVolunteers
        });
        triggerFileDownload(pdfBlob, `${deletingCampaign.name.replace(/\s+/g, "_")}_Deletion_Archive.pdf`);
      } catch (docErr) {
        console.warn("Could not auto-download PDF during deletion:", docErr);
      }

      // 2. Perform archive and permanent database deletion via RPC
      const res = await AdminApi.archiveAndDeleteReferralCampaign(deletingCampaign.id);

      if (res.success) {
        setDeletingCampaign(null);
        setDeleteVolunteers([]);
        loadData(false);
        Alert.alert("Campaign Deleted", "Campaign was archived and permanently deleted from active records.");
      } else {
        Alert.alert("Deletion Error", res.error || "Failed to delete campaign.");
      }
    } catch (e: any) {
      Alert.alert("Deletion Exception", e?.message || "Failed to delete campaign.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered lists
  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
      c.startDate.includes(search) ||
      c.endDate.includes(search)
  );

  const filteredArchives = archives.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSsm = ssmReferrals.filter(
    (s) =>
      s.storeName.toLowerCase().includes(search.toLowerCase()) ||
      s.referralCode.toLowerCase().includes(search.toLowerCase()) ||
      (s.referredByCode && s.referredByCode.toLowerCase().includes(search.toLowerCase())) ||
      s.state.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSsc = sscReferrals.filter(
    (c) =>
      c.consumerName.toLowerCase().includes(search.toLowerCase()) ||
      c.shopperPassCode.toLowerCase().includes(search.toLowerCase()) ||
      c.referredBy.toLowerCase().includes(search.toLowerCase()) ||
      c.consumerPhone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 1. Top Header Bar with Prominent "New Campaign" Button */}
      <View style={[styles.headerBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>Referral & Campaign Management</Text>
          <Text style={[styles.headerSub, { color: colors.textSub }]}>
            Attribution & campaign tracking for SSC Consumers, SSM Merchants & Campaign Volunteers
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* New Campaign Button */}
          <TouchableOpacity
            style={styles.newCampaignBtn}
            onPress={handleOpenNewCampaign}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.newCampaignBtnText}>New Campaign</Text>
          </TouchableOpacity>

          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshIconBtn, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}
            onPress={() => onRefresh()}
            activeOpacity={0.7}
          >
            <RefreshCw size={15} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            { backgroundColor: tab === "campaigns" ? colors.tabActiveBg : colors.tabInactiveBg }
          ]}
          onPress={() => setTab("campaigns")}
          activeOpacity={0.8}
        >
          <Megaphone
            size={14}
            color={tab === "campaigns" ? "#FFFFFF" : colors.textSub}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: tab === "campaigns" ? "#FFFFFF" : colors.textSub,
                fontWeight: tab === "campaigns" ? "800" : "600"
              }
            ]}
          >
            Campaigns ({campaigns.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            { backgroundColor: tab === "ssm" ? colors.tabActiveBg : colors.tabInactiveBg }
          ]}
          onPress={() => setTab("ssm")}
          activeOpacity={0.8}
        >
          <Store size={14} color={tab === "ssm" ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
          <Text
            style={[
              styles.tabText,
              { color: tab === "ssm" ? "#FFFFFF" : colors.textSub, fontWeight: tab === "ssm" ? "800" : "600" }
            ]}
          >
            SSM Store Referrals ({ssmReferrals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            { backgroundColor: tab === "ssc" ? colors.tabActiveBg : colors.tabInactiveBg }
          ]}
          onPress={() => setTab("ssc")}
          activeOpacity={0.8}
        >
          <Users size={14} color={tab === "ssc" ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
          <Text
            style={[
              styles.tabText,
              { color: tab === "ssc" ? "#FFFFFF" : colors.textSub, fontWeight: tab === "ssc" ? "800" : "600" }
            ]}
          >
            SSC Consumer Passes ({sscReferrals.length})
          </Text>
        </TouchableOpacity>

        {archives.length > 0 && (
          <TouchableOpacity
            style={[
              styles.tabBtn,
              { backgroundColor: tab === "archives" ? colors.tabActiveBg : colors.tabInactiveBg }
            ]}
            onPress={() => setTab("archives")}
            activeOpacity={0.8}
          >
            <Archive size={14} color={tab === "archives" ? "#FFFFFF" : colors.textSub} style={{ marginRight: 6 }} />
            <Text
              style={[
                styles.tabText,
                { color: tab === "archives" ? "#FFFFFF" : colors.textSub, fontWeight: tab === "archives" ? "800" : "600" }
              ]}
            >
              Archived ({archives.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={16} color={colors.textSub} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textMain }]}
            placeholder={
              tab === "campaigns"
                ? "Search campaign name, date or details..."
                : tab === "ssm"
                ? "Search store code or name..."
                : tab === "archives"
                ? "Search deleted campaign archive..."
                : "Search shopper pass, name or campaign..."
            }
            placeholderTextColor={colors.textSub}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* 4. Tab Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Loading referral data...</Text>
        </View>
      ) : tab === "campaigns" ? (
        /* =================================================================== */
        /* CAMPAIGNS DASHBOARD LIST                                            */
        /* =================================================================== */
        <FlatList
          data={filteredCampaigns}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Megaphone size={40} color={colors.textSub} style={{ marginBottom: 12, opacity: 0.6 }} />
              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No referral campaigns found</Text>
              <Text style={[styles.emptySub, { color: colors.textSub, textAlign: "center" }]}>
                {search.trim()
                  ? "No campaigns match your search query."
                  : "Click '+ New Campaign' above to create volunteer referral campaigns with unique codes."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {/* Campaign Header */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.campaignCardTitle, { color: colors.textMain }]}>{item.name}</Text>
                  {item.description ? (
                    <Text style={[styles.subText, { color: colors.textSub }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isDark ? "#064E3B" : "#ECFDF5" }]}>
                  <CheckCircle2 size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              {/* Campaign Schedule Row in IST */}
              <View style={[styles.scheduleCard, { backgroundColor: isDark ? "#121926" : "#F8FAFC", borderColor: colors.border }]}>
                <View style={styles.scheduleItem}>
                  <Calendar size={13} color="#2563EB" style={{ marginRight: 5 }} />
                  <Text style={[styles.scheduleLabel, { color: colors.textSub }]}>Start: </Text>
                  <Text style={[styles.scheduleValue, { color: colors.textMain }]}>
                    {item.startDate} at {item.startTime} (IST)
                  </Text>
                </View>
                <View style={styles.scheduleItem}>
                  <Clock size={13} color="#EA580C" style={{ marginRight: 5 }} />
                  <Text style={[styles.scheduleLabel, { color: colors.textSub }]}>End: </Text>
                  <Text style={[styles.scheduleValue, { color: colors.textMain }]}>
                    {item.endDate} at {item.endTime} (IST)
                  </Text>
                </View>
              </View>

              {/* Metrics Row */}
              <View style={styles.campaignMetricsRow}>
                <View style={styles.campaignMetric}>
                  <Users size={13} color={colors.textSub} style={{ marginRight: 4 }} />
                  <Text style={[styles.metricLabel, { color: colors.textSub }]}>Volunteers: </Text>
                  <Text style={[styles.metricValue, { color: colors.textMain }]}>{item.volunteerCount}</Text>
                </View>
                <View style={styles.campaignMetric}>
                  <Sparkles size={13} color="#EA580C" style={{ marginRight: 4 }} />
                  <Text style={[styles.metricLabel, { color: colors.textSub }]}>Codes: </Text>
                  <Text style={[styles.metricValue, { color: colors.textMain }]}>{item.generatedCodesCount}</Text>
                </View>
                <View style={styles.campaignMetric}>
                  <Text style={[styles.metricLabel, { color: colors.textSub }]}>Created: </Text>
                  <Text style={[styles.metricValue, { color: colors.textSub }]}>
                    {item.createdAt ? item.createdAt.substring(0, 10) : "—"}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Bar */}
              <View style={[styles.campaignActionsRow, { borderTopColor: colors.border }]}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {/* View Details */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}
                    onPress={() => handleOpenViewDetails(item)}
                    activeOpacity={0.7}
                  >
                    <Eye size={12} color={colors.textMain} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: colors.textMain }]}>View</Text>
                  </TouchableOpacity>

                  {/* Edit Campaign */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}
                    onPress={() => handleOpenEditCampaign(item)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={12} color={colors.textMain} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: colors.textMain }]}>Edit</Text>
                  </TouchableOpacity>

                  {/* Track Campaign Performance */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? "#064E3B" : "#ECFDF5" }]}
                    onPress={() => handleOpenTracking(item)}
                    activeOpacity={0.7}
                  >
                    <TrendingUp size={12} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: "#059669", fontWeight: "700" }]}>Track</Text>
                  </TouchableOpacity>

                  {/* Download PDF */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
                    onPress={() => handleDownloadPDF(item)}
                    activeOpacity={0.7}
                  >
                    <FileText size={12} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>PDF</Text>
                  </TouchableOpacity>

                  {/* Download DOCX */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#EFF6FF" }]}
                    onPress={() => handleDownloadDOCX(item)}
                    activeOpacity={0.7}
                  >
                    <Download size={12} color="#2563EB" style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: "#2563EB" }]}>DOCX</Text>
                  </TouchableOpacity>
                </View>

                {/* Delete Campaign */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? "#450A0A" : "#FEE2E2" }]}
                  onPress={() => handleInitiateDelete(item)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={12} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : tab === "archives" ? (
        /* =================================================================== */
        /* ARCHIVED (DELETED) CAMPAIGNS                                        */
        /* =================================================================== */
        <FlatList
          data={filteredArchives}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, opacity: 0.9 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.campaignCardTitle, { color: colors.textMain }]}>{item.name}</Text>
                  <Text style={[styles.subText, { color: colors.textSub }]}>
                    Archived on {item.archivedAt ? item.archivedAt.substring(0, 10) : "—"} by {item.archivedBy}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "#F1F5F9" }]}>
                  <Archive size={12} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={[styles.statusBadgeText, { color: "#64748B" }]}>ARCHIVED</Text>
                </View>
              </View>

              <View style={[styles.campaignActionsRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.textSub }]}>
                  Volunteers: {item.volunteerCount}
                </Text>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
                    onPress={() => handleDownloadArchivePDF(item)}
                    activeOpacity={0.7}
                  >
                    <FileText size={12} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Download PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#EFF6FF" }]}
                    onPress={() => handleDownloadArchiveDOCX(item)}
                    activeOpacity={0.7}
                  >
                    <Download size={12} color="#2563EB" style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: "#2563EB" }]}>Download DOCX</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      ) : tab === "ssm" ? (
        /* =================================================================== */
        /* SSM STORE REFERRALS (PRESERVED 100%)                                */
        /* =================================================================== */
        <FlatList
          data={filteredSsm}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No store referrals found</Text>
              <Text style={[styles.emptySub, { color: colors.textSub }]}>
                {search.trim() ? "No stores match the search query" : "Verified SSM referral records will appear here"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.storeName, { color: colors.textMain }]}>{item.storeName}</Text>
                  <Text style={[styles.subText, { color: colors.textSub }]}>
                    {item.phone} • {item.state}
                  </Text>
                </View>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeLabel}>PASS: </Text>
                  <Text style={styles.codeValue}>{item.referralCode}</Text>
                </View>
              </View>

              <View style={[styles.attributionRow, { backgroundColor: isDark ? "#121926" : "#F8FAFC" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Share2 size={13} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={[styles.attrLabel, { color: colors.textSub }]}>Referred By: </Text>
                  <Text style={[styles.attrValue, { color: colors.textMain }]}>
                    {item.referredByCode || "Direct Onboarding"}
                  </Text>
                </View>
                {item.referredAt && (
                  <Text style={[styles.dateText, { color: colors.textSub }]}>{item.referredAt}</Text>
                )}
              </View>
            </View>
          )}
        />
      ) : (
        /* =================================================================== */
        /* SSC CONSUMER PASSES (PRESERVED 100%)                                */
        /* =================================================================== */
        <FlatList
          data={filteredSsc}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No consumer passes found</Text>
              <Text style={[styles.emptySub, { color: colors.textSub }]}>
                {search.trim() ? "No consumer passes match the search query" : "Verified SSC shopper pass records will appear here"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.storeName, { color: colors.textMain }]}>{item.consumerName}</Text>
                  <Text style={[styles.subText, { color: colors.textSub }]}>{item.consumerPhone}</Text>
                </View>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeLabel}>PASS: </Text>
                  <Text style={styles.codeValue}>{item.shopperPassCode}</Text>
                </View>
              </View>

              <View style={[styles.attributionRow, { backgroundColor: isDark ? "#121926" : "#F8FAFC" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Share2 size={13} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={[styles.attrLabel, { color: colors.textSub }]}>Referred By: </Text>
                  <Text style={[styles.attrValue, { color: colors.textMain }]}>{item.referredBy}</Text>
                </View>
                <View style={styles.rewardBadge}>
                  <Gift size={11} color="#16A34A" style={{ marginRight: 3 }} />
                  <Text style={styles.rewardText}>{item.bonusReward}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* ===================================================================== */}
      {/* 5. CREATE / EDIT CAMPAIGN MODAL                                       */}
      {/* ===================================================================== */}
      {isCampaignModalOpen && (
        <Modal
          visible={isCampaignModalOpen}
          animationType="slide"
          onRequestClose={() => setIsCampaignModalOpen(false)}
        >
          <View style={[styles.modalScreen, { backgroundColor: colors.bg }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeaderBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalHeaderTitle, { color: colors.textMain }]}>
                  {editingCampaignId ? "Edit Referral Campaign" : "New Referral Campaign"}
                </Text>
                <Text style={[styles.modalHeaderSub, { color: colors.textSub }]}>
                  Configure campaign schedule, volunteer roster and unique referral codes
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseCircle, { backgroundColor: colors.inputBg }]}
                onPress={() => setIsCampaignModalOpen(false)}
              >
                <X size={18} color={colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Top Banner Action: Generate Random Referral Codes */}
              <View style={[styles.prominentGeneratorBanner, { backgroundColor: isDark ? "#1E293B" : "#FFF7ED", borderColor: "#FDBA74" }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Sparkles size={16} color="#EA580C" style={{ marginRight: 6 }} />
                    <Text style={styles.generatorBannerTitle}>Automated Referral Code Generator</Text>
                  </View>
                  <Text style={[styles.generatorBannerSub, { color: colors.textSub }]}>
                    Instantly generates globally unique, collision-free codes for all {volunteerRows.length} volunteers
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.generatorBtn, generatingCodes && { opacity: 0.6 }]}
                  onPress={handleGenerateRandomCodes}
                  disabled={generatingCodes}
                  activeOpacity={0.8}
                >
                  {generatingCodes ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Sparkles size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.generatorBtnText}>Generate Random Referral Codes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Campaign Information Card */}
              <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.formCardTitle, { color: colors.textMain }]}>Campaign Information</Text>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSub }]}>Campaign Name *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    placeholder="e.g. Kerala Onboarding Drive 2026"
                    placeholderTextColor={colors.textSub}
                    value={campaignName}
                    onChangeText={setCampaignName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSub }]}>Description / Campaign Details</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain, minHeight: 60 }]}
                    placeholder="Enter details, outreach objectives, or location targets..."
                    placeholderTextColor={colors.textSub}
                    value={campaignDesc}
                    onChangeText={setCampaignDesc}
                    multiline
                  />
                </View>

                {/* Date & Time Row */}
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.formLabel, { color: colors.textSub }]}>Start Date (YYYY-MM-DD) *</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                      value={campaignStartDate}
                      onChangeText={setCampaignStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSub}
                    />
                  </View>

                  <View style={[styles.formGroup, { width: 110 }]}>
                    <Text style={[styles.formLabel, { color: colors.textSub }]}>Start Time (IST) *</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                      value={campaignStartTime}
                      onChangeText={setCampaignStartTime}
                      placeholder="09:00"
                      placeholderTextColor={colors.textSub}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.formLabel, { color: colors.textSub }]}>End Date (YYYY-MM-DD) *</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                      value={campaignEndDate}
                      onChangeText={setCampaignEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSub}
                    />
                  </View>

                  <View style={[styles.formGroup, { width: 110 }]}>
                    <Text style={[styles.formLabel, { color: colors.textSub }]}>End Time (IST) *</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                      value={campaignEndTime}
                      onChangeText={setCampaignEndTime}
                      placeholder="18:00"
                      placeholderTextColor={colors.textSub}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSub }]}>Number of Volunteers *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                    keyboardType="number-pad"
                    value={volunteerCountInput}
                    onChangeText={handleVolunteerCountChange}
                    placeholder="Enter total volunteer count (e.g. 5, 15)..."
                    placeholderTextColor={colors.textSub}
                  />
                  <Text style={[styles.formHelpText, { color: colors.textSub }]}>
                    Changing this count dynamically updates the volunteer entries below while preserving entered details.
                  </Text>
                </View>
              </View>

              {/* Dynamic Volunteer Detail Rows */}
              <View style={styles.volunteerSectionHeader}>
                <Text style={[styles.volunteerSectionTitle, { color: colors.textMain }]}>
                  Volunteer Details & Schedules ({volunteerRows.length})
                </Text>
                <Text style={[styles.volunteerSectionSub, { color: colors.textSub }]}>
                  Enter each volunteer's name and mobile number. Assign unique referral codes and optional shifts.
                </Text>
              </View>

              {volunteerRows.map((v, index) => (
                <View
                  key={index}
                  style={[styles.volunteerCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                >
                  <View style={styles.volunteerCardHeader}>
                    <View style={styles.volunteerSerialPill}>
                      <Text style={styles.volunteerSerialText}>#{v.serialNumber}</Text>
                    </View>
                    <Text style={[styles.volunteerCardTitle, { color: colors.textMain }]}>
                      Volunteer #{v.serialNumber}
                    </Text>
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1.2, marginRight: 8 }]}>
                      <Text style={[styles.formLabel, { color: colors.textSub }]}>Volunteer Name *</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                        placeholder="e.g. Rahul Varma"
                        placeholderTextColor={colors.textSub}
                        value={v.volunteerName}
                        onChangeText={(text) => {
                          setVolunteerRows((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, volunteerName: text } : row))
                          );
                        }}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={[styles.formLabel, { color: colors.textSub }]}>Mobile Number *</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                        placeholder="10-digit mobile"
                        placeholderTextColor={colors.textSub}
                        keyboardType="phone-pad"
                        value={v.mobileNumber}
                        onChangeText={(text) => {
                          setVolunteerRows((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, mobileNumber: text } : row))
                          );
                        }}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={[styles.formLabel, { color: colors.textSub }]}>Referral Code *</Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: v.referralCode ? "#EA580C" : colors.border,
                            color: "#EA580C",
                            fontWeight: "700"
                          }
                        ]}
                        placeholder="CMP-XXXXXX"
                        placeholderTextColor={colors.textSub}
                        autoCapitalize="characters"
                        value={v.referralCode}
                        onChangeText={(text) => {
                          setVolunteerRows((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, referralCode: text.toUpperCase() } : row
                            )
                          );
                        }}
                      />
                    </View>
                  </View>

                  {/* Optional Individual Schedule */}
                  <View style={styles.individualScheduleRow}>
                    <Text style={[styles.scheduleOptionalLabel, { color: colors.textSub }]}>
                      Individual Schedule (Optional):
                    </Text>

                    <View style={styles.formRow}>
                      <TextInput
                        style={[styles.scheduleInputSmall, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                        placeholder="Date (YYYY-MM-DD)"
                        placeholderTextColor={colors.textSub}
                        value={v.assignedDate || ""}
                        onChangeText={(text) => {
                          setVolunteerRows((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, assignedDate: text } : row))
                          );
                        }}
                      />
                      <TextInput
                        style={[styles.scheduleInputSmall, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                        placeholder="Start (09:00)"
                        placeholderTextColor={colors.textSub}
                        value={v.assignedStartTime || ""}
                        onChangeText={(text) => {
                          setVolunteerRows((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, assignedStartTime: text } : row))
                          );
                        }}
                      />
                      <TextInput
                        style={[styles.scheduleInputSmall, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textMain }]}
                        placeholder="End (18:00)"
                        placeholderTextColor={colors.textSub}
                        value={v.assignedEndTime || ""}
                        onChangeText={(text) => {
                          setVolunteerRows((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, assignedEndTime: text } : row))
                          );
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal Bottom Action Bar */}
            <View style={[styles.modalFooterBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setIsCampaignModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textMain }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, savingCampaign && { opacity: 0.6 }]}
                onPress={handleSaveCampaign}
                disabled={savingCampaign}
                activeOpacity={0.8}
              >
                {savingCampaign ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSaveBtnText}>Save Campaign & Volunteers</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* 6. VIEW CAMPAIGN DETAILS MODAL                                        */}
      {/* ===================================================================== */}
      {selectedViewCampaign && (
        <Modal
          visible={!!selectedViewCampaign}
          animationType="fade"
          onRequestClose={() => setSelectedViewCampaign(null)}
        >
          <View style={[styles.modalScreen, { backgroundColor: colors.bg }]}>
            <View style={[styles.modalHeaderBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalHeaderTitle, { color: colors.textMain }]}>
                  {selectedViewCampaign.name}
                </Text>
                <Text style={[styles.modalHeaderSub, { color: colors.textSub }]}>
                  {formatToIST(selectedViewCampaign.startDate, selectedViewCampaign.startTime)} →{" "}
                  {formatToIST(selectedViewCampaign.endDate, selectedViewCampaign.endTime)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseCircle, { backgroundColor: colors.inputBg }]}
                onPress={() => setSelectedViewCampaign(null)}
              >
                <X size={18} color={colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Campaign Summary & Quick Export Bar */}
              <View style={[styles.viewDetailsHeaderCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                {selectedViewCampaign.description ? (
                  <Text style={[styles.viewDetailsDesc, { color: colors.textMain }]}>
                    {selectedViewCampaign.description}
                  </Text>
                ) : null}

                <View style={styles.viewDetailsExportRow}>
                  <Text style={[styles.metricLabel, { color: colors.textSub }]}>
                    Total Volunteers:{" "}
                    <Text style={{ fontWeight: "800", color: colors.textMain }}>
                      {selectedViewCampaign.volunteerCount}
                    </Text>
                  </Text>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.exportBtn, { backgroundColor: "#FEF2F2" }]}
                      onPress={() => handleDownloadPDF(selectedViewCampaign)}
                      activeOpacity={0.7}
                    >
                      <FileText size={13} color="#DC2626" style={{ marginRight: 5 }} />
                      <Text style={[styles.exportBtnText, { color: "#DC2626" }]}>Export PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.exportBtn, { backgroundColor: "#EFF6FF" }]}
                      onPress={() => handleDownloadDOCX(selectedViewCampaign)}
                      activeOpacity={0.7}
                    >
                      <Download size={13} color="#2563EB" style={{ marginRight: 5 }} />
                      <Text style={[styles.exportBtnText, { color: "#2563EB" }]}>Export DOCX</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Volunteers Roster Table */}
              <Text style={[styles.rosterTitle, { color: colors.textMain }]}>
                Volunteer Roster & Generated Codes ({selectedViewVolunteers.length})
              </Text>

              {loadingDetails ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[styles.loadingText, { color: colors.textSub }]}>Loading volunteer roster...</Text>
                </View>
              ) : selectedViewVolunteers.length === 0 ? (
                <Text style={[styles.emptySub, { color: colors.textSub, marginHorizontal: 20 }]}>
                  No volunteer details recorded.
                </Text>
              ) : (
                <View style={[styles.tableContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  {/* Table Header */}
                  <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? "#121926" : "#F1F5F9" }]}>
                    <Text style={[styles.tableHeaderCol, { width: 45, color: colors.textSub }]}>S.No</Text>
                    <Text style={[styles.tableHeaderCol, { flex: 1.2, color: colors.textSub }]}>Volunteer Name</Text>
                    <Text style={[styles.tableHeaderCol, { flex: 1, color: colors.textSub }]}>Mobile</Text>
                    <Text style={[styles.tableHeaderCol, { flex: 1.1, color: colors.textSub }]}>Referral Code</Text>
                    <Text style={[styles.tableHeaderCol, { flex: 1.2, color: colors.textSub }]}>Schedule</Text>
                  </View>

                  {/* Table Rows */}
                  {selectedViewVolunteers.map((v, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.tableDataRow,
                        { borderBottomColor: colors.border },
                        idx % 2 === 1 && { backgroundColor: isDark ? "#121926" : "#F8FAFC" }
                      ]}
                    >
                      <Text style={[styles.tableDataText, { width: 45, color: colors.textSub }]}>#{v.serialNumber}</Text>
                      <Text style={[styles.tableDataText, { flex: 1.2, color: colors.textMain, fontWeight: "600" }]}>
                        {v.volunteerName}
                      </Text>
                      <Text style={[styles.tableDataText, { flex: 1, color: colors.textMain }]}>{v.mobileNumber}</Text>
                      <View style={{ flex: 1.1, flexDirection: "row", alignItems: "center" }}>
                        <Text style={[styles.tableDataText, { color: "#EA580C", fontWeight: "800" }]}>
                          {v.referralCode}
                        </Text>
                      </View>
                      <Text style={[styles.tableDataText, { flex: 1.2, color: colors.textSub, fontSize: 11 }]}>
                        {v.assignedDate
                          ? `${v.assignedDate}${v.assignedStartTime ? ` (${v.assignedStartTime}-${v.assignedEndTime || ""})` : ""}`
                          : "Full Campaign"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* 6B. DEDICATED CAMPAIGN REFERRAL TRACKING PAGE / MODAL                 */}
      {/* ===================================================================== */}
      {selectedTrackCampaign && (
        <Modal
          visible={!!selectedTrackCampaign}
          animationType="slide"
          onRequestClose={() => setSelectedTrackCampaign(null)}
        >
          <View style={[styles.modalScreen, { backgroundColor: colors.bg }]}>
            {/* Header Bar */}
            <View style={[styles.modalHeaderBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TrendingUp size={20} color="#059669" style={{ marginRight: 8 }} />
                  <Text style={[styles.modalHeaderTitle, { color: colors.textMain }]}>
                    Tracking: {selectedTrackCampaign.name}
                  </Text>
                </View>
                <Text style={[styles.modalHeaderSub, { color: colors.textSub }]}>
                  {formatToIST(selectedTrackCampaign.startDate, selectedTrackCampaign.startTime)} →{" "}
                  {formatToIST(selectedTrackCampaign.endDate, selectedTrackCampaign.endTime)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.statusBadge, { backgroundColor: isDark ? "#064E3B" : "#ECFDF5" }]}>
                  <CheckCircle2 size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.statusBadgeText}>{selectedTrackCampaign.status.toUpperCase()}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.refreshIconBtn, { backgroundColor: colors.inputBg }]}
                  onPress={handleRefreshTracking}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={14} color={colors.textMain} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalCloseCircle, { backgroundColor: colors.inputBg }]}
                  onPress={() => setSelectedTrackCampaign(null)}
                >
                  <X size={18} color={colors.textMain} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Campaign Details Header Card */}
              <View style={[styles.viewDetailsHeaderCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                {selectedTrackCampaign.description ? (
                  <Text style={[styles.viewDetailsDesc, { color: colors.textMain, marginBottom: 12 }]}>
                    {selectedTrackCampaign.description}
                  </Text>
                ) : null}

                {/* 4 Prominent Campaign Summary KPIs */}
                <View style={styles.trackingKpiRow}>
                  {/* Total Volunteers */}
                  <View style={[styles.trackingKpiCard, { backgroundColor: isDark ? "#121926" : "#F8FAFC", borderColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={[styles.kpiLabel, { color: colors.textSub }]}>Total Volunteers</Text>
                      <Users size={16} color="#2563EB" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#2563EB" }]}>
                      {trackingSummary.totalVolunteers}
                    </Text>
                  </View>

                  {/* Total Merchants Onboarded (SSM) */}
                  <View style={[styles.trackingKpiCard, { backgroundColor: isDark ? "#121926" : "#F8FAFC", borderColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={[styles.kpiLabel, { color: colors.textSub }]}>SSM Merchants</Text>
                      <Building2 size={16} color="#10B981" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#10B981" }]}>
                      {trackingSummary.totalMerchants}
                    </Text>
                  </View>

                  {/* Total Consumers Onboarded (SSC) */}
                  <View style={[styles.trackingKpiCard, { backgroundColor: isDark ? "#121926" : "#F8FAFC", borderColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={[styles.kpiLabel, { color: colors.textSub }]}>SSC Consumers</Text>
                      <ShoppingBag size={16} color="#EA580C" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#EA580C" }]}>
                      {trackingSummary.totalConsumers}
                    </Text>
                  </View>

                  {/* Total Onboarded (SSM + SSC) */}
                  <View style={[styles.trackingKpiCard, { backgroundColor: isDark ? "#064E3B" : "#ECFDF5", borderColor: "#10B981" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={[styles.kpiLabel, { color: "#065F46", fontWeight: "700" }]}>Total Onboarded</Text>
                      <TrendingUp size={16} color="#059669" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#059669", fontWeight: "900" }]}>
                      {trackingSummary.totalOnboarded}
                    </Text>
                  </View>
                </View>

                {/* Toolbar: Search input & PDF/DOCX Export Buttons */}
                <View style={styles.trackingToolbarRow}>
                  <View style={[styles.trackingSearchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Search size={14} color={colors.textSub} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.trackingSearchInput, { color: colors.textMain }]}
                      placeholder="Search by volunteer name, referral code or phone..."
                      placeholderTextColor={colors.textSub}
                      value={trackingSearch}
                      onChangeText={setTrackingSearch}
                    />
                    {trackingSearch ? (
                      <TouchableOpacity onPress={() => setTrackingSearch("")}>
                        <X size={14} color={colors.textSub} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.exportBtn, { backgroundColor: "#FEF2F2" }]}
                      onPress={() => handleDownloadPDF(selectedTrackCampaign)}
                      activeOpacity={0.7}
                    >
                      <FileText size={13} color="#DC2626" style={{ marginRight: 5 }} />
                      <Text style={[styles.exportBtnText, { color: "#DC2626" }]}>Export PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.exportBtn, { backgroundColor: "#EFF6FF" }]}
                      onPress={() => handleDownloadDOCX(selectedTrackCampaign)}
                      activeOpacity={0.7}
                    >
                      <Download size={13} color="#2563EB" style={{ marginRight: 5 }} />
                      <Text style={[styles.exportBtnText, { color: "#2563EB" }]}>Export DOCX</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Volunteer Performance Table */}
              <Text style={[styles.rosterTitle, { color: colors.textMain }]}>
                Volunteer Performance Roster ({filteredTrackingVolunteers.length})
              </Text>

              {loadingTracking ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[styles.loadingText, { color: colors.textSub, marginTop: 10 }]}>
                    Verifying live referral attribution records from Supabase...
                  </Text>
                </View>
              ) : filteredTrackingVolunteers.length === 0 ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <Text style={[styles.emptySub, { color: colors.textSub }]}>
                    {trackingSearch ? "No volunteers match search criteria." : "No volunteer performance records found."}
                  </Text>
                </View>
              ) : (
                <View style={[styles.tableContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, marginBottom: 24 }]}>
                  {/* Table Header */}
                  <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? "#121926" : "#F1F5F9" }]}>
                    <Text style={[styles.tableHeaderCol, { width: 50, color: colors.textSub }]}>S.No</Text>
                    <Text style={[styles.tableHeaderCol, { flex: 1.4, color: colors.textSub }]}>Volunteer Name</Text>
                    <Text style={[styles.tableHeaderCol, { flex: 1.1, color: colors.textSub }]}>Mobile Number</Text>
                    <Text style={[styles.tableHeaderCol, { flex: 1.2, color: colors.textSub }]}>Referral Code</Text>
                    <Text style={[styles.tableHeaderCol, { width: 100, textAlign: "center", color: "#10B981" }]}>SSM Merchants</Text>
                    <Text style={[styles.tableHeaderCol, { width: 100, textAlign: "center", color: "#EA580C" }]}>SSC Consumers</Text>
                    <Text style={[styles.tableHeaderCol, { width: 110, textAlign: "center", color: "#059669" }]}>Total Onboarded</Text>
                  </View>

                  {/* Table Data Rows */}
                  {filteredTrackingVolunteers.map((v, idx) => (
                    <View
                      key={v.id || idx}
                      style={[
                        styles.tableDataRow,
                        { borderBottomColor: colors.border },
                        idx % 2 === 1 && { backgroundColor: isDark ? "#121926" : "#F8FAFC" }
                      ]}
                    >
                      <Text style={[styles.tableDataText, { width: 50, color: colors.textSub }]}>#{v.serialNumber}</Text>
                      
                      <View style={{ flex: 1.4, paddingRight: 6 }}>
                        <Text style={[styles.tableDataText, { color: colors.textMain, fontWeight: "700" }]}>
                          {v.volunteerName}
                        </Text>
                        {v.assignedDate ? (
                          <Text style={{ fontSize: 10, color: colors.textSub, marginTop: 2 }}>
                            {v.assignedDate}
                          </Text>
                        ) : null}
                      </View>

                      <Text style={[styles.tableDataText, { flex: 1.1, color: colors.textMain }]}>
                        {v.mobileNumber}
                      </Text>

                      <View style={{ flex: 1.2, flexDirection: "row", alignItems: "center" }}>
                        <Text style={[styles.tableDataText, { color: "#EA580C", fontWeight: "800", marginRight: 6 }]}>
                          {v.referralCode}
                        </Text>
                        <TouchableOpacity onPress={() => copyToClipboard(v.referralCode)}>
                          <Copy size={11} color={colors.textSub} />
                        </TouchableOpacity>
                      </View>

                      {/* SSM Merchants Onboarded */}
                      <View style={{ width: 100, alignItems: "center" }}>
                        <View style={[styles.countBadge, { backgroundColor: v.ssmMerchants > 0 ? (isDark ? "#064E3B" : "#ECFDF5") : (isDark ? "#1E293B" : "#F1F5F9") }]}>
                          <Text style={[styles.countBadgeText, { color: v.ssmMerchants > 0 ? "#10B981" : colors.textSub }]}>
                            {v.ssmMerchants}
                          </Text>
                        </View>
                      </View>

                      {/* SSC Consumers Onboarded */}
                      <View style={{ width: 100, alignItems: "center" }}>
                        <View style={[styles.countBadge, { backgroundColor: v.sscConsumers > 0 ? (isDark ? "#431407" : "#FFF7ED") : (isDark ? "#1E293B" : "#F1F5F9") }]}>
                          <Text style={[styles.countBadgeText, { color: v.sscConsumers > 0 ? "#EA580C" : colors.textSub }]}>
                            {v.sscConsumers}
                          </Text>
                        </View>
                      </View>

                      {/* Total Onboarded */}
                      <View style={{ width: 110, alignItems: "center" }}>
                        <View style={[styles.countBadge, { backgroundColor: v.totalOnboarded > 0 ? (isDark ? "#064E3B" : "#D1FAE5") : (isDark ? "#1E293B" : "#F1F5F9") }]}>
                          <Text style={[styles.countBadgeText, { color: v.totalOnboarded > 0 ? "#059669" : colors.textSub, fontWeight: "800" }]}>
                            {v.totalOnboarded}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Table Totals Summary Row */}
                  <View style={[styles.tableFooterTotalRow, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderTopColor: colors.border }]}>
                    <Text style={[styles.tableFooterTotalLabel, { flex: 1, color: colors.textMain }]}>
                      OVERALL CAMPAIGN TOTALS
                    </Text>
                    <View style={{ width: 100, alignItems: "center" }}>
                      <Text style={[styles.tableFooterTotalValue, { color: "#10B981" }]}>
                        {trackingSummary.totalMerchants}
                      </Text>
                    </View>
                    <View style={{ width: 100, alignItems: "center" }}>
                      <Text style={[styles.tableFooterTotalValue, { color: "#EA580C" }]}>
                        {trackingSummary.totalConsumers}
                      </Text>
                    </View>
                    <View style={{ width: 110, alignItems: "center" }}>
                      <Text style={[styles.tableFooterTotalValue, { color: "#059669", fontWeight: "900" }]}>
                        {trackingSummary.totalOnboarded}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* 7. DELETE CONFIRMATION & ARCHIVE EXPORT MODAL                          */}
      {/* ===================================================================== */}
      {deletingCampaign && (
        <Modal
          visible={!!deletingCampaign}
          transparent
          animationType="fade"
          onRequestClose={() => setDeletingCampaign(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.deleteModalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.deleteModalHeader}>
                <AlertTriangle size={24} color="#DC2626" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deleteModalTitle, { color: colors.textMain }]}>
                    Delete Campaign & Create Archive
                  </Text>
                  <Text style={[styles.deleteModalSub, { color: colors.textSub }]}>
                    Campaign: {deletingCampaign.name} ({deletingCampaign.volunteerCount} volunteers)
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDeletingCampaign(null)}>
                  <X size={18} color={colors.textSub} />
                </TouchableOpacity>
              </View>

              <View style={styles.deleteModalBody}>
                <Text style={[styles.deleteBodyText, { color: colors.textMain }]}>
                  Before permanent database deletion, a complete snapshot containing all campaign info and volunteer referral codes will be stored in the archive repository.
                </Text>
                <Text style={[styles.deleteBodySub, { color: colors.textSub, marginTop: 8 }]}>
                  You can also download the complete export documents right now:
                </Text>

                {/* Pre-deletion download buttons */}
                <View style={styles.deletePreDownloadRow}>
                  <TouchableOpacity
                    style={[styles.exportBtn, { backgroundColor: "#FEF2F2" }]}
                    onPress={() => handleDownloadPDF(deletingCampaign)}
                    activeOpacity={0.7}
                  >
                    <FileText size={13} color="#DC2626" style={{ marginRight: 5 }} />
                    <Text style={[styles.exportBtnText, { color: "#DC2626" }]}>Download PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.exportBtn, { backgroundColor: "#EFF6FF" }]}
                    onPress={() => handleDownloadDOCX(deletingCampaign)}
                    activeOpacity={0.7}
                  >
                    <Download size={13} color="#2563EB" style={{ marginRight: 5 }} />
                    <Text style={[styles.exportBtnText, { color: "#2563EB" }]}>Download DOCX</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.deleteModalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setDeletingCampaign(null)}
                  disabled={isDeleting}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.textMain }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteConfirmBtn, isDeleting && { opacity: 0.6 }]}
                  onPress={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Trash2 size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.deleteConfirmBtnText}>Archive & Permanently Delete</Text>
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
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2
  },
  newCampaignBtn: {
    backgroundColor: "#EA580C",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  newCampaignBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
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
    gap: 8,
    flexWrap: "wrap"
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  tabText: {
    fontSize: 12
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 13
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden"
  },
  cardHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  campaignCardTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669"
  },
  scheduleCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  scheduleLabel: {
    fontSize: 11,
    fontWeight: "600"
  },
  scheduleValue: {
    fontSize: 12,
    fontWeight: "700"
  },
  campaignMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 16
  },
  campaignMetric: {
    flexDirection: "row",
    alignItems: "center"
  },
  metricLabel: {
    fontSize: 11
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "700"
  },
  campaignActionsRow: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700"
  },
  storeName: {
    fontSize: 14,
    fontWeight: "700"
  },
  subText: {
    fontSize: 11,
    marginTop: 2
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#EA580C"
  },
  codeValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
    letterSpacing: 0.5
  },
  attributionRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  attrLabel: {
    fontSize: 11
  },
  attrValue: {
    fontSize: 11,
    fontWeight: "700"
  },
  dateText: {
    fontSize: 10
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  rewardText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A"
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
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4
  },
  emptySub: {
    fontSize: 12
  },
  // Modal Styles
  modalScreen: {
    flex: 1
  },
  modalHeaderBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "800"
  },
  modalHeaderSub: {
    fontSize: 12,
    marginTop: 2
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  modalScrollContent: {
    padding: 20
  },
  prominentGeneratorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 10
  },
  generatorBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EA580C"
  },
  generatorBannerSub: {
    fontSize: 11,
    marginTop: 2
  },
  generatorBtn: {
    backgroundColor: "#EA580C",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8
  },
  generatorBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  formCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12
  },
  formGroup: {
    marginBottom: 12
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4
  },
  formInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13
  },
  formHelpText: {
    fontSize: 10,
    marginTop: 4
  },
  volunteerSectionHeader: {
    marginBottom: 12
  },
  volunteerSectionTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  volunteerSectionSub: {
    fontSize: 12,
    marginTop: 2
  },
  volunteerCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10
  },
  volunteerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  volunteerSerialPill: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8
  },
  volunteerSerialText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800"
  },
  volunteerCardTitle: {
    fontSize: 13,
    fontWeight: "700"
  },
  individualScheduleRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.2)"
  },
  scheduleOptionalLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4
  },
  scheduleInputSmall: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    marginRight: 6
  },
  modalFooterBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700"
  },
  modalSaveBtn: {
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  // View Details Modal Styles
  viewDetailsHeaderCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16
  },
  viewDetailsDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12
  },
  viewDetailsExportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: "800"
  },
  rosterTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden"
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tableHeaderCol: {
    fontSize: 11,
    fontWeight: "700"
  },
  tableDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  tableDataText: {
    fontSize: 12
  },
  // Delete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden"
  },
  deleteModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)"
  },
  deleteModalTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  deleteModalSub: {
    fontSize: 12,
    marginTop: 2
  },
  deleteModalBody: {
    padding: 18
  },
  deleteBodyText: {
    fontSize: 13,
    lineHeight: 18
  },
  deleteBodySub: {
    fontSize: 12
  },
  deletePreDownloadRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10
  },
  deleteModalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    padding: 14,
    borderTopWidth: 1
  },
  deleteConfirmBtn: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8
  },
  deleteConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  // Dedicated Campaign Referral Tracking Styles
  trackingKpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16
  },
  trackingKpiCard: {
    flex: 1,
    minWidth: 160,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "600"
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800"
  },
  trackingToolbarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4,
    marginBottom: 14
  },
  trackingSearchBox: {
    flex: 1,
    minWidth: 260,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    borderWidth: 1
  },
  trackingSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 32,
    alignItems: "center"
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  tableFooterTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 2
  },
  tableFooterTotalLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  tableFooterTotalValue: {
    fontSize: 13,
    fontWeight: "800"
  }
});
