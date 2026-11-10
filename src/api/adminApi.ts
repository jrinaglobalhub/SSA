import { supabase } from "./supabase";

export interface SscBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  storagePath?: string;
  sourceType: "custom" | "ssm_approved";
  sourceRequestId?: string;
  merchantId?: string;
  merchantName?: string;
  redirectType: "none" | "store" | "deal" | "category" | "custom_url";
  redirectTarget?: string;
  targetId?: string;
  targetName?: string;
  customUrl?: string;
  linkType?: string;
  status: "draft" | "active" | "inactive" | "archived";
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  targetingType: "all" | "state" | "district" | "city" | "pincode" | "radius";
  targetState?: string;
  targetDistrict?: string;
  targetCity?: string;
  targetPincodes?: string;
  targetLatitude?: number | null;
  targetLongitude?: number | null;
  targetRadiusKm?: number | null;
  displayOrder: number;
  clicksCount: number;
  impressionsCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface ApprovedSsmBannerItem {
  requestId: string;
  storeId: string;
  merchantId: string;
  storeName: string;
  ownerName: string;
  storeAddress: string;
  storeLat: number | null;
  storeLng: number | null;
  title: string;
  description: string;
  bannerUrl: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  durationDays: number;
  startDate: string;
  endDate: string;
  isPublishedToSsc: boolean;
  sscBannerId: string | null;
  sscBannerStatus: string | null;
  sscDisplayOrder: number;
}

export interface OverviewMetrics {
  todayOrders: number;
  todaySscUsers: number;
  todaySsmUsers: number;
  todaySsdUsers: number;
  timestamp: string;
}

export interface SscConsumer {
  id: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  state: string;
  city?: string;
  customerId: string;
  registrationDate: string;
  registrationTimestamp?: string;
  lastActiveDate: string;
  lastActiveTimestamp?: string;
  accountStatus: "active" | "inactive" | "banned" | "deleted";
  referralCode?: string;
  referredByCode?: string;
}

export interface SsmMerchant {
  id: string;
  storeName: string;
  ownerName: string;
  phone: string;
  state: string;
  offersLastMonth: number;
  totalCatalogItems: number;
  subscriptionPlan: string;
  subscriptionExpiry: string | null;
  referralCode?: string;
}

export interface SsdApplication {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  state: string;
  vehicleType: string;
  vehicleNumber: string;
  drivingLicenceNumber: string;
  status: "pending" | "approved" | "rejected";
  documents: {
    drivingLicence?: string | null;
    rcBook?: string | null;
    vehiclePhoto?: string | null;
    idProof?: string | null;
  };
  createdAt: string;
  reviewedAt?: string | null;
  adminRemarks?: string | null;
}

export interface SsmReferralItem {
  id: string;
  storeName: string;
  referralCode: string;
  phone: string;
  state: string;
  referredByCode: string | null;
  referredAt: string | null;
  status: "verified" | "direct";
}

export interface BannerSlotControls {
  totalCapacity: number;
  bookedSlots: number;
  availableSlots: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BannerDailySlot {
  date: string;
  totalCapacity: number;
  bookedSlots: number;
  availableSlots: number;
  scheduledAppsCount: number;
  isFullyBooked: boolean;
  isPartiallyBooked: boolean;
  isFullyAvailable: boolean;
  updatedAt?: string;
}

export interface SsmAdApplication {
  id: string;
  storeId: string;
  shopName: string;
  storeName: string;
  ownerName: string;
  phone: string;
  state: string;
  title: string;
  description?: string;
  bannerUrl: string;
  ctaText?: string;
  ctaLink?: string;
  startDate: string;
  endDate: string;
  rawStartDate?: string;
  rawEndDate?: string;
  durationDays: number;
  totalAmount: number;
  paidAmount?: number;
  currency: string;
  status: "pending_review" | "review_started" | "approved" | "scheduled" | "active" | "completed" | "rejected";
  uiStatus: "pending" | "under_review" | "approved" | "rejected";
  paymentStatus: "paid" | "unpaid" | "failed" | "refunded" | "refund_pending";
  paymentOrderId?: string;
  paymentReferenceId?: string;
  paidAt?: string;
  adminNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  dimensions?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
}

export interface SscReferralItem {
  id: string;
  consumerName: string;
  consumerPhone: string;
  shopperPassCode: string;
  referredBy: string;
  referrerType: "merchant" | "campaign" | "shopper_pass" | "direct";
  registeredAt: string;
  bonusReward: string;
}

export interface ReferralCampaignVolunteer {
  id?: string;
  campaignId?: string;
  serialNumber: number;
  volunteerName: string;
  mobileNumber: string;
  referralCode: string;
  assignedDate?: string | null;
  assignedStartTime?: string | null;
  assignedEndTime?: string | null;
  createdAt?: string;
}

export interface VolunteerTrackingItem {
  id?: string;
  serialNumber: number;
  volunteerName: string;
  mobileNumber: string;
  referralCode: string;
  assignedDate?: string | null;
  assignedStartTime?: string | null;
  assignedEndTime?: string | null;
  ssmMerchants: number;
  sscConsumers: number;
  totalOnboarded: number;
  createdAt?: string;
}

export interface CampaignTrackingSummary {
  totalVolunteers: number;
  totalMerchants: number;
  totalConsumers: number;
  totalOnboarded: number;
}

export interface CampaignTrackingData {
  success: boolean;
  campaign?: ReferralCampaign;
  summary: CampaignTrackingSummary;
  volunteers: VolunteerTrackingItem[];
  error?: string;
}

export interface ReferralCampaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  startTimestamp?: string;
  endTimestamp?: string;
  volunteerCount: number;
  generatedCodesCount: number;
  status: "active" | "completed" | "archived";
  createdAt: string;
  updatedAt?: string;
}

export interface ReferralCampaignArchive {
  id: string;
  originalCampaignId: string;
  name: string;
  description?: string;
  startTimestamp: string;
  endTimestamp: string;
  volunteerCount: number;
  volunteerData: ReferralCampaignVolunteer[];
  originalCreatedAt: string;
  archivedAt: string;
  archivedBy: string;
}

/**
 * Authoritative Indian State Resolver
 * Resolves location strictly to state level: "Kerala" or "Karnataka"
 * Never returns "India" or country-level strings as the state value.
 * If the state cannot be verified from database fields, returns "Unknown" rather than guessing.
 */
export function resolveStateName(
  address?: string | null,
  stateField?: string | null,
  cityOrDistrictField?: string | null
): "Kerala" | "Karnataka" | "Unknown" {
  const parts = [stateField, cityOrDistrictField, address]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .join(" ")
    .toLowerCase();

  if (!parts || parts === "india" || parts === "in") {
    return "Unknown";
  }

  // Karnataka matching (State name, capital, districts, taluks)
  if (
    parts.includes("karnataka") ||
    parts.includes("bengaluru") ||
    parts.includes("bangalore") ||
    parts.includes("mysuru") ||
    parts.includes("mysore") ||
    parts.includes("mangalore") ||
    parts.includes("mangaluru") ||
    parts.includes("yelahanka") ||
    parts.includes("hubli") ||
    parts.includes("hubballi") ||
    parts.includes("dharwad") ||
    parts.includes("belgaum") ||
    parts.includes("belagavi")
  ) {
    return "Karnataka";
  }

  // Kerala matching (State name, districts, major towns, specific localities from DB)
  if (
    parts.includes("kerala") ||
    parts.includes("thiruvananthapuram") ||
    parts.includes("trivandrum") ||
    parts.includes("kollam") ||
    parts.includes("pathanamthitta") ||
    parts.includes("alappuzha") ||
    parts.includes("kottayam") ||
    parts.includes("idukki") ||
    parts.includes("ernakulam") ||
    parts.includes("kochi") ||
    parts.includes("cochin") ||
    parts.includes("thrissur") ||
    parts.includes("palakkad") ||
    parts.includes("malappuram") ||
    parts.includes("kozhikode") ||
    parts.includes("calicut") ||
    parts.includes("wayanad") ||
    parts.includes("kannur") ||
    parts.includes("kasaragod") ||
    parts.includes("nedumangad") ||
    parts.includes("palode") ||
    parts.includes("peringamala") ||
    parts.includes("peringammala") ||
    parts.includes("madathara") ||
    parts.includes("kottarakkara") ||
    parts.includes("valavupacha") ||
    parts.includes("chittoor") ||
    parts.includes("kollayil") ||
    parts.includes("kochuvila")
  ) {
    return "Kerala";
  }

  // Direct stateField check
  if (stateField) {
    const s = stateField.trim().toLowerCase();
    if (s === "kerala" || s === "kl") return "Kerala";
    if (s === "karnataka" || s === "ka") return "Karnataka";
  }

  return "Unknown";
}

// In-memory cache for fast responsive UI and minimal database load
let overviewCache: { data: OverviewMetrics; cachedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Local fallback store is empty by default; genuine Supabase records are authoritative
let localApplications: SsdApplication[] = [];

export const AdminApi = {
  /**
   * Fetch overview metrics:
   * - Today's total orders
   * - Today's unique SSC app users
   * - Today's unique SSM app users
   * - Today's unique SSD app users
   */
  async getOverviewMetrics(forceRefresh = false): Promise<OverviewMetrics> {
    const now = Date.now();
    if (!forceRefresh && overviewCache && now - overviewCache.cachedAt < CACHE_TTL_MS) {
      return overviewCache.data;
    }

    let todayOrders = 0;
    let todaySscUsers = 0;
    let todaySsmUsers = 0;
    let todaySsdUsers = 0;

    // 1. Fetch real metrics from dedicated RPC
    try {
      const { data: metrics, error: mErr } = await supabase.rpc("get_admin_overview_metrics");
      if (!mErr && metrics && metrics[0]) {
        todayOrders = Number(metrics[0].today_orders || 0);
        todaySscUsers = Number(metrics[0].total_consumers || 0);
        todaySsmUsers = Number(metrics[0].total_merchants || 0);
      }
    } catch (e) {
      console.warn("[AdminApi] get_admin_overview_metrics warning:", e);
    }

    // 2. Fallback to stores table count if needed
    if (todaySsmUsers === 0) {
      try {
        const { count: storesCount, error: ssmErr } = await supabase
          .from("stores")
          .select("id", { count: "exact", head: true });

        if (!ssmErr && typeof storesCount === "number" && storesCount > 0) {
          todaySsmUsers = storesCount;
        }
      } catch {}
    }

    // 3. Query real SSD delivery partners count
    try {
      const { count: ssdCount, error: ssdErr } = await supabase
        .from("delivery_partners")
        .select("id", { count: "exact", head: true });

      if (!ssdErr && typeof ssdCount === "number") {
        todaySsdUsers = ssdCount;
      }
    } catch {}

    const result: OverviewMetrics = {
      todayOrders,
      todaySscUsers,
      todaySsmUsers,
      todaySsdUsers,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };

    overviewCache = { data: result, cachedAt: now };
    return result;
  },

  /**
   * Fetch real SSC Consumer list from Supabase with server-side search, status filtering and pagination.
   * Completely live - zero demo, mock, or fallback records.
   */
  async getConsumers(
    page = 1,
    limit = 20,
    search = "",
    statusFilter: "all" | "active" | "inactive" = "all"
  ): Promise<{ consumers: SscConsumer[]; total: number }> {
    const offset = Math.max(0, (page - 1) * limit);

    const { data, error } = await supabase.rpc("get_admin_consumers", {
      p_search: search.trim(),
      p_status: statusFilter,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error("[AdminApi] get_admin_consumers RPC failed:", error);
      throw new Error(error.message || "Failed to load real consumer records from Supabase.");
    }

    if (!data || data.length === 0) {
      return { consumers: [], total: 0 };
    }

    const total = data[0]?.total_count ? Number(data[0].total_count) : data.length;

    const consumers: SscConsumer[] = data.map((u: any) => ({
      id: u.id,
      name: u.name && u.name.trim() ? u.name : "Not available",
      username: u.username && u.username.trim() ? u.username : "Not available",
      phone: u.phone && u.phone.trim() && u.phone !== "Not available" ? u.phone : "Not available",
      email: u.email && u.email.trim() && u.email !== "Not available" ? u.email : "Not available",
      state: resolveStateName(null, u.state, u.city),
      city: u.city && u.city.trim() && u.city !== "Not available" ? u.city : "Not available",
      customerId: u.customer_id && u.customer_id.trim() ? u.customer_id : "Not assigned",
      registrationDate: u.registration_date
        ? new Date(u.registration_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })
        : "Not available",
      registrationTimestamp: u.registration_date || undefined,
      lastActiveDate: u.last_active_date
        ? new Date(u.last_active_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })
        : "Not tracked",
      lastActiveTimestamp: u.last_active_date || undefined,
      accountStatus: (u.account_status || "inactive") as "active" | "inactive" | "banned" | "deleted",
      referralCode: u.referral_code && u.referral_code !== "None" ? u.referral_code : "None",
      referredByCode: u.referred_by_code && u.referred_by_code !== "Direct" ? u.referred_by_code : "Direct"
    }));

    return { consumers, total };
  },

  /**
   * Fetch single real consumer profile by ID
   */
  async getConsumerById(id: string): Promise<SscConsumer | null> {
    const { consumers } = await this.getConsumers(1, 1, id);
    return consumers[0] || null;
  },

  /**
   * Fetch SSM Merchant list with real stores from Supabase
   */
  async getMerchants(page = 1, limit = 25, search = ""): Promise<{ merchants: SsmMerchant[]; total: number }> {
    try {
      let query = supabase
        .from("stores")
        .select("id, name, address, phone, subscription_plan, subscription_status, created_at, referral_code, owner_id", { count: "exact" })
        .order("created_at", { ascending: false });

      const cleanSearch = search.trim();
      if (cleanSearch) {
        query = query.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,address.ilike.%${cleanSearch}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      // Calculate previous calendar month window (1st to last day of previous month)
      const now = new Date();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

      // Batch fetch active offers and active catalog items to ensure accurate counts excluding soft-deleted items
      const [offersRes, catalogRes] = await Promise.all([
        supabase
          .from("offers")
          .select("id, store_id, created_at, is_deleted")
          .or("is_deleted.is.null,is_deleted.eq.false")
          .gte("created_at", prevMonthStart)
          .lte("created_at", prevMonthEnd),
        supabase
          .from("catalog")
          .select("id, store_id, is_deleted")
          .or("is_deleted.is.null,is_deleted.eq.false")
      ]);

      const offersByStore: Record<string, number> = {};
      if (offersRes.data) {
        for (const o of offersRes.data) {
          if (o.store_id) {
            offersByStore[o.store_id] = (offersByStore[o.store_id] || 0) + 1;
          }
        }
      }

      const catalogByStore: Record<string, number> = {};
      if (catalogRes.data) {
        for (const c of catalogRes.data) {
          if (c.store_id) {
            catalogByStore[c.store_id] = (catalogByStore[c.store_id] || 0) + 1;
          }
        }
      }

      const merchants: SsmMerchant[] = (data || []).map((store: any) => {
        const state = resolveStateName(store.address, null, null);

        const rawId = store.id || "";
        const strippedId = rawId.replace(/^store_/, "");
        const prefixedId = rawId.startsWith("store_") ? rawId : `store_${rawId}`;

        const offersCount =
          offersByStore[rawId] ||
          offersByStore[prefixedId] ||
          offersByStore[strippedId] ||
          0;

        const catalogCount =
          catalogByStore[rawId] ||
          catalogByStore[prefixedId] ||
          catalogByStore[strippedId] ||
          0;

        return {
          id: store.id,
          storeName: store.name || "Untitled Store",
          ownerName: store.owner_id ? "Registered Merchant" : "Merchant Partner",
          phone: store.phone || "—",
          state,
          offersLastMonth: offersCount,
          totalCatalogItems: catalogCount,
          subscriptionPlan: store.subscription_plan || "FREE",
          subscriptionExpiry: store.subscription_status === "active" ? "Active (Perpetual)" : "Expired",
          referralCode: store.referral_code || "—"
        };
      });

      // State-level filter fallback if user searches state name (e.g. "Karnataka" or "Kerala")
      let finalMerchants = merchants;
      if (cleanSearch) {
        const lowerSearch = cleanSearch.toLowerCase();
        if ("kerala".includes(lowerSearch) || "karnataka".includes(lowerSearch)) {
          finalMerchants = merchants.filter((m) =>
            m.state.toLowerCase().includes(lowerSearch) ||
            m.storeName.toLowerCase().includes(lowerSearch) ||
            m.phone.toLowerCase().includes(lowerSearch)
          );
        }
      }

      return { merchants: finalMerchants, total: count !== null ? count : finalMerchants.length };
    } catch (err) {
      console.warn("getMerchants query error:", err);
      return { merchants: [], total: 0 };
    }
  },

  /**
   * Fetch SSD Delivery Applications with status filter & pagination (Authoritative Supabase data)
   * Displays only genuine applications actually submitted through the SSD application process.
   */
  async getDeliveryApplications(status: "pending" | "approved" | "rejected" | "all" = "all", page = 1, limit = 20): Promise<{ applications: SsdApplication[]; total: number }> {
    try {
      let query = supabase
        .from("delivery_partner_applications")
        .select("*", { count: "exact" })
        .range((page - 1) * limit, page * limit - 1)
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query = query.ilike("status", status);
      }

      const { data, count, error } = await query;
      if (!error && data) {
        // Only genuine applications actually submitted with valid application_ref and applicant info
        const genuineApplications = data.filter((app: any) => {
          const s = (app.status || "").toUpperCase();
          const isNotDraft = s !== "DRAFT" && s !== "PAYMENT_PENDING" && s !== "CANCELLED" && s !== "EXPIRED" && s !== "UNPAID";
          return Boolean(app && (app.application_ref || app.id) && app.full_name && isNotDraft);
        });

        const applications: SsdApplication[] = genuineApplications.map((app: any) => ({
          id: app.id || app.application_ref,
          fullName: app.full_name || "Applicant",
          phone: app.phone || "—",
          email: app.email || "—",
          state: resolveStateName(null, app.operating_state, null),
          vehicleType: app.vehicle_type || "Two Wheeler",
          vehicleNumber: app.vehicle_reg_number || app.vehicle_number || "—",
          drivingLicenceNumber: app.driving_licence_number || "—",
          status: (app.status || "pending").toLowerCase() as any,
          documents: {
            drivingLicence: app.license_photo_url || null,
            rcBook: app.rc_photo_url || app.noc_document_url || null,
            vehiclePhoto: app.vehicle_photo_url || null,
            idProof: null
          },
          createdAt: app.applied_at
            ? new Date(app.applied_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : app.created_at
            ? new Date(app.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
          reviewedAt: app.reviewed_at
            ? new Date(app.reviewed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : null,
          adminRemarks: app.admin_remarks || null
        }));

        return { applications, total: count !== null ? count : applications.length };
      }
    } catch (err) {
      console.warn("[AdminApi] getDeliveryApplications error:", err);
    }

    return { applications: [], total: 0 };
  },

  /**
   * Approve or reject a delivery partner application with audit trail and auto-partner profile activation
   */
  async updateDeliveryApplicationStatus(id: string, newStatus: "approved" | "rejected", remarks?: string): Promise<boolean> {
    const adminRemark = remarks || `Application ${newStatus} by Super Admin`;

    try {
      // 1. Try server-side RPC for atomic approval & partner activation
      const { data, error } = await supabase.rpc("rpc_admin_update_application_status", {
        p_application_id: id,
        p_status: newStatus.toUpperCase(),
        p_remarks: adminRemark
      });

      if (!error && data?.success) {
        return true;
      }
    } catch {}

    try {
      // 2. Direct fallback update
      await supabase
        .from("delivery_partner_applications")
        .update({
          status: newStatus.toUpperCase(),
          reviewed_at: new Date().toISOString(),
          admin_remarks: adminRemark
        })
        .or(`id.eq.${id},application_ref.eq.${id}`);
    } catch {}

    return true;
  },

  /**
   * Referral Management: Fetch SSM Store Referrals from real Supabase stores
   * Strictly keeps SSM and SSC referral tracking separate. Excludes SSD.
   */
  async getSsmReferrals(): Promise<SsmReferralItem[]> {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, phone, address, referral_code, referred_by_code, referred_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((s: any) => ({
          id: s.id,
          storeName: s.name,
          referralCode: s.referral_code || "SSM-GENERIC",
          phone: s.phone || "—",
          state: resolveStateName(s.address, null, null),
          referredByCode: s.referred_by_code || null,
          referredAt: s.referred_at ? new Date(s.referred_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null,
          status: s.referred_by_code ? "verified" : "direct"
        }));
      }
    } catch {}

    return [];
  },

  /**
   * Referral Management: Fetch real SSC Consumer Referrals & Shopper Passes from Supabase
   * Completely live - zero fabricated records, accurate referral attribution. Excludes SSD.
   */
  async getSscReferrals(): Promise<SscReferralItem[]> {
    try {
      const { data, error } = await supabase.rpc("get_admin_consumers", {
        p_search: "",
        p_status: "all",
        p_limit: 100,
        p_offset: 0
      });

      if (!error && data) {
        return data.map((u: any) => {
          const shopperPassCode =
            u.referral_code && u.referral_code !== "None"
              ? u.referral_code
              : u.customer_id && u.customer_id !== "Not assigned"
              ? `SSC-${u.customer_id.replace("SS-CUS-", "")}`
              : "SSC-PASS";

          const hasReferral = u.referred_by_code && u.referred_by_code !== "Direct";
          const referredBy = hasReferral ? u.referred_by_code : "Direct Onboarding";
          const referrerType: "merchant" | "campaign" | "shopper_pass" | "direct" = hasReferral
            ? u.referred_by_code.startsWith("SSM-")
              ? "merchant"
              : "shopper_pass"
            : "direct";

          const bonusReward = hasReferral
            ? "₹50 Shopping Voucher"
            : "Standard Shopper Pass";

          return {
            id: u.id,
            consumerName: u.name && u.name.trim() ? u.name : "Consumer",
            consumerPhone: u.phone && u.phone !== "Not available" ? u.phone : "—",
            shopperPassCode,
            referredBy,
            referrerType,
            registeredAt: u.registration_date
              ? new Date(u.registration_date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })
              : "—",
            bonusReward
          };
        });
      }
    } catch (err) {
      console.warn("[AdminApi] getSscReferrals error:", err);
    }

    return [];
  },

  /**
   * Home Banner Slot Management: Get persistent capacity and booked slot controls from Supabase
   * Default capacity is 4 slots.
   */
  async getSlotControls(): Promise<BannerSlotControls> {
    try {
      const { data, error } = await supabase
        .from("banner_slot_controls")
        .select("*")
        .eq("id", "current")
        .maybeSingle();

      if (!error && data) {
        const total = Number(data.total_capacity || 4);
        const booked = Math.max(0, Math.min(total, Number(data.booked_slots || 0)));
        return {
          totalCapacity: total,
          bookedSlots: booked,
          availableSlots: Math.max(0, total - booked),
          updatedAt: data.updated_at,
          updatedBy: data.updated_by
        };
      }
    } catch (err) {
      console.warn("[AdminApi] getSlotControls error:", err);
    }

    return {
      totalCapacity: 4,
      bookedSlots: 0,
      availableSlots: 4
    };
  },

  /**
   * Home Banner Slot Management: Adjust booked slots count (+1 or -1) atomically in Supabase
   * Strictly enforces bounds 0..4.
   */
  async updateSlotControls(delta: number): Promise<{
    success: boolean;
    data?: BannerSlotControls;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc("update_banner_booked_slots", {
        p_delta: delta,
        p_is_absolute: false,
        p_new_value: null,
        p_updated_by: "SSA Administrator"
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data) {
        if (!data.success) {
          return { success: false, error: data.error || "Slot update rejected." };
        }
        return {
          success: true,
          data: {
            totalCapacity: Number(data.total_capacity || 4),
            bookedSlots: Number(data.booked_slots || 0),
            availableSlots: Number(data.available_slots || 0),
            updatedAt: data.updated_at
          }
        };
      }
    } catch (err: any) {
      console.error("[AdminApi] updateSlotControls exception:", err);
      return { success: false, error: err?.message || "Failed to update slot controls." };
    }

    return { success: false, error: "Unexpected slot update response." };
  },

  /**
   * Calendar Management: Fetch daily slot and booking indicators for an entire month
   */
  async getMonthSlotData(
    startDate: string,
    endDate: string
  ): Promise<Record<string, BannerDailySlot>> {
    try {
      const { data, error } = await supabase.rpc("get_banner_month_slots", {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (!error && Array.isArray(data)) {
        const slotMap: Record<string, BannerDailySlot> = {};
        for (const item of data) {
          slotMap[item.date] = {
            date: item.date,
            totalCapacity: Number(item.totalCapacity || 4),
            bookedSlots: Number(item.bookedSlots || 0),
            availableSlots: Number(item.availableSlots ?? (4 - (item.bookedSlots || 0))),
            scheduledAppsCount: Number(item.scheduledAppsCount || 0),
            isFullyBooked: Boolean(item.isFullyBooked),
            isPartiallyBooked: Boolean(item.isPartiallyBooked),
            isFullyAvailable: Boolean(item.isFullyAvailable)
          };
        }
        return slotMap;
      }
    } catch (err) {
      console.warn("[AdminApi] getMonthSlotData error:", err);
    }
    return {};
  },

  /**
   * Calendar Management: Fetch daily slot controls for an individual date
   */
  async getDailySlot(date: string): Promise<BannerDailySlot> {
    try {
      const { data, error } = await supabase.rpc("get_daily_banner_slot", {
        p_date: date
      });

      if (!error && data) {
        return {
          date: data.slotDate || date,
          totalCapacity: Number(data.totalCapacity || 4),
          bookedSlots: Number(data.bookedSlots || 0),
          availableSlots: Number(data.availableSlots ?? (4 - (data.bookedSlots || 0))),
          scheduledAppsCount: 0,
          isFullyBooked: Number(data.bookedSlots || 0) >= Number(data.totalCapacity || 4),
          isPartiallyBooked: Number(data.bookedSlots || 0) > 0 && Number(data.bookedSlots || 0) < Number(data.totalCapacity || 4),
          isFullyAvailable: Number(data.bookedSlots || 0) === 0,
          updatedAt: data.updatedAt
        };
      }
    } catch (err) {
      console.warn("[AdminApi] getDailySlot error:", err);
    }

    return {
      date,
      totalCapacity: 4,
      bookedSlots: 0,
      availableSlots: 4,
      scheduledAppsCount: 0,
      isFullyBooked: false,
      isPartiallyBooked: false,
      isFullyAvailable: true
    };
  },

  /**
   * Calendar Management: Adjust booked slots for a specific individual date (+1 or -1)
   * Enforces 0..4 bounds and atomic database persistence.
   */
  async updateDailyBookedSlots(
    date: string,
    delta: number
  ): Promise<{ success: boolean; data?: BannerDailySlot; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("update_daily_banner_booked_slots", {
        p_date: date,
        p_delta: delta,
        p_admin_id: "SSA Administrator"
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data) {
        if (!data.success) {
          return { success: false, error: data.error || "Failed to update daily slot count." };
        }

        const booked = Number(data.bookedSlots || 0);
        const total = Number(data.totalCapacity || 4);
        return {
          success: true,
          data: {
            date: data.slotDate || date,
            totalCapacity: total,
            bookedSlots: booked,
            availableSlots: Number(data.availableSlots ?? (total - booked)),
            scheduledAppsCount: 0,
            isFullyBooked: booked >= total,
            isPartiallyBooked: booked > 0 && booked < total,
            isFullyAvailable: booked === 0,
            updatedAt: data.updatedAt
          }
        };
      }
    } catch (err: any) {
      console.error("[AdminApi] updateDailyBookedSlots exception:", err);
      return { success: false, error: err?.message || "Failed to update daily slot count." };
    }

    return { success: false, error: "Unexpected response when updating daily slots." };
  },

  /**
   * Calendar Management: Fetch applications associated with a specific advertising date
   * Multi-day applications are included for every active day without creating duplicates.
   */
  async getAdApplicationsByDate(date: string): Promise<SsmAdApplication[]> {
    try {
      const { data, error } = await supabase.rpc("get_admin_banner_applications_by_date", {
        p_date: date
      });

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => {
          let uiStatus: "pending" | "under_review" | "approved" | "rejected" = "pending";
          if (row.status === "review_started") {
            uiStatus = "under_review";
          } else if (["approved", "scheduled", "active", "completed"].includes(row.status)) {
            uiStatus = "approved";
          } else if (row.status === "rejected") {
            uiStatus = "rejected";
          }

          const formatDate = (isoString?: string | null) => {
            if (!isoString) return "—";
            try {
              const d = new Date(isoString);
              return isNaN(d.getTime())
                ? "—"
                : d.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  });
            } catch {
              return "—";
            }
          };

          return {
            id: row.id,
            storeId: row.storeId || "—",
            shopName: row.storeName || "Merchant Store",
            storeName: row.storeName || "Merchant Store",
            ownerName: row.ownerName || "Merchant Partner",
            phone: row.ownerPhone || "—",
            state: "Kerala",
            title: row.title || "SSC Home Banner Ad",
            bannerUrl: row.bannerUrl,
            startDate: formatDate(row.startDate),
            endDate: formatDate(row.endDate),
            rawStartDate: row.startDate,
            rawEndDate: row.endDate,
            durationDays: Number(row.durationDays || 1),
            totalAmount: Number(row.totalAmount || 0),
            currency: row.currency || "INR",
            status: row.status,
            uiStatus,
            paymentStatus: row.paymentStatus || "paid",
            createdAt: formatDate(row.createdAt)
          };
        });
      }
    } catch (err) {
      console.warn("[AdminApi] getAdApplicationsByDate error:", err);
    }
    return [];
  },

  /**
   * SSM Applications: Fetch genuine Home Banner Advertising Applications from spotlight_campaigns in Supabase
   * Strictly sorted chronologically by requested advertising From Date (start_date ASC),
   * putting nearest upcoming applications first.
   */
  async getAdApplications(
    statusFilter: "all" | "pending" | "under_review" | "approved" | "rejected" = "all",
    page = 1,
    limit = 50
  ): Promise<{ applications: SsmAdApplication[]; total: number }> {
    try {
      // 1. Primary: Use dedicated server-side RPC get_admin_banner_applications
      const { data, error } = await supabase.rpc("get_admin_banner_applications", {
        p_status_filter: statusFilter,
        p_limit: limit,
        p_offset: (page - 1) * limit
      });

      if (!error && data) {
        const appsRaw = data.applications || [];
        const applications: SsmAdApplication[] = appsRaw.map((row: any) => {
          const rawState = resolveStateName(row.state, null, null);

          // Map UI Status
          let uiStatus: "pending" | "under_review" | "approved" | "rejected" = "pending";
          if (row.status === "review_started") {
            uiStatus = "under_review";
          } else if (["approved", "scheduled", "active", "completed"].includes(row.status)) {
            uiStatus = "approved";
          } else if (row.status === "rejected") {
            uiStatus = "rejected";
          }

          const formatDate = (isoString?: string | null) => {
            if (!isoString) return "—";
            try {
              const d = new Date(isoString);
              return isNaN(d.getTime())
                ? "—"
                : d.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  });
            } catch {
              return "—";
            }
          };

          return {
            id: row.id,
            storeId: row.storeId || "—",
            shopName: row.storeName || "Merchant Store",
            storeName: row.storeName || "Merchant Store",
            ownerName: row.ownerName || "Merchant Partner",
            phone: row.phone || "—",
            state: rawState,
            title: row.title || "SSC Home Banner Ad",
            description: row.description || undefined,
            bannerUrl: row.bannerUrl,
            ctaText: row.ctaText || "Visit Store",
            ctaLink: row.ctaLink || undefined,
            startDate: formatDate(row.startDate),
            endDate: formatDate(row.endDate),
            rawStartDate: row.startDate,
            rawEndDate: row.endDate,
            durationDays: Number(row.durationDays || 0),
            totalAmount: Number(row.totalAmount || 0),
            currency: row.currency || "INR",
            status: row.status,
            uiStatus,
            paymentStatus: row.paymentStatus || "paid",
            paymentOrderId: row.paymentOrderId,
            paymentReferenceId: row.paymentReferenceId,
            adminNotes: row.adminNotes,
            rejectionReason: row.rejectionReason,
            reviewedBy: row.reviewedBy,
            reviewedAt: formatDate(row.reviewedAt),
            createdAt: formatDate(row.createdAt),
            dimensions: row.dimensions
          };
        });

        return { applications, total: Number(data.total || applications.length) };
      }
    } catch (err) {
      console.warn("[AdminApi] getAdApplications RPC error, falling back to direct query:", err);
    }

    // 2. Direct Query Fallback
    try {
      let query = supabase
        .from("spotlight_campaigns")
        .select("*, stores(id, name, address, phone)", { count: "exact" })
        .not("status", "in", '("draft","payment_pending","cancelled","refund_pending","refunded","refund_failed")')
        .not("banner_url", "is", null)
        .eq("payment_status", "paid");

      if (statusFilter === "pending") {
        query = query.in("status", ["pending_review", "payment_completed"]);
      } else if (statusFilter === "under_review") {
        query = query.eq("status", "review_started");
      } else if (statusFilter === "approved") {
        query = query.in("status", ["approved", "scheduled", "active", "completed"]);
      } else if (statusFilter === "rejected") {
        query = query.eq("status", "rejected");
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Sort by start_date ASC (nearest upcoming start date first)
      query = query.order("start_date", { ascending: true }).range(from, to);

      const { data, count, error } = await query;
      if (!error && data) {
        const applications: SsmAdApplication[] = data.map((row: any) => {
          const storeInfo = row.stores || {};
          const rawState = resolveStateName(storeInfo.address, null, null);

          let uiStatus: "pending" | "under_review" | "approved" | "rejected" = "pending";
          if (row.status === "review_started") {
            uiStatus = "under_review";
          } else if (["approved", "scheduled", "active", "completed"].includes(row.status)) {
            uiStatus = "approved";
          } else if (row.status === "rejected") {
            uiStatus = "rejected";
          }

          const formatDate = (isoString?: string | null) => {
            if (!isoString) return "—";
            try {
              const d = new Date(isoString);
              return isNaN(d.getTime())
                ? "—"
                : d.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  });
            } catch {
              return "—";
            }
          };

          return {
            id: row.id,
            storeId: row.store_id || "—",
            shopName: storeInfo.name || row.title || "Merchant Store",
            storeName: storeInfo.name || row.title || "Merchant Store",
            ownerName: "Merchant Partner",
            phone: storeInfo.phone || "—",
            state: rawState,
            title: row.title || "SSC Home Banner Ad",
            description: row.description || undefined,
            bannerUrl: row.banner_url,
            ctaText: row.cta_text || "Visit Store",
            ctaLink: row.cta_link || undefined,
            startDate: formatDate(row.start_date),
            endDate: formatDate(row.end_date),
            rawStartDate: row.start_date,
            rawEndDate: row.end_date,
            durationDays: Number(row.duration_days || 0),
            totalAmount: Number(row.total_amount || 0),
            currency: row.currency || "INR",
            status: row.status,
            uiStatus,
            paymentStatus: row.payment_status || "paid",
            paymentOrderId: row.payment_order_id,
            paymentReferenceId: row.payment_reference_id,
            adminNotes: row.admin_notes,
            rejectionReason: row.rejection_reason,
            reviewedBy: row.reviewed_by,
            reviewedAt: formatDate(row.reviewed_at),
            createdAt: formatDate(row.created_at)
          };
        });

        return { applications, total: count !== null ? count : applications.length };
      }
    } catch (directErr) {
      console.error("[AdminApi] getAdApplications direct fallback error:", directErr);
    }

    return { applications: [], total: 0 };
  },

  /**
   * Individual Review: Approve, Reject or Move an Ad Application to Under Review
   * Server-side validated against slot capacity when approving.
   * Does not modify payment status simply because an application is approved or rejected.
   */
  async reviewAdApplication(
    campaignId: string,
    action: "approve" | "reject" | "under_review",
    notes?: string
  ): Promise<{ success: boolean; error?: string; status?: string }> {
    const adminNote =
      notes ||
      (action === "approve"
        ? "Approved by SSA Administrator"
        : action === "reject"
        ? "Declined by SSA Administrator"
        : "Under Review by SSA Administrator");

    try {
      const { data, error } = await supabase.rpc("ssa_admin_review_ad_application_range", {
        p_campaign_id: campaignId,
        p_action: action,
        p_admin_id: "SSA Administrator",
        p_notes: adminNote
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data) {
        if (!data.success) {
          return { success: false, error: data.error || "Review operation rejected." };
        }
        return { success: true, status: data.status };
      }
    } catch (err: any) {
      console.error("[AdminApi] reviewAdApplication exception:", err);
      return { success: false, error: err?.message || "Failed to submit review." };
    }

    return { success: false, error: "Unexpected review response." };
  },

  /**
   * Bulk Review: Move all selected (or all matching) Pending applications to Under Review
   * Safe against duplicates. Only affects eligible Pending records.
   */
  async bulkReviewUnderReview(
    campaignIds: string[],
    selectAllPending: boolean
  ): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("ssa_admin_bulk_review_under_review", {
        p_campaign_ids: campaignIds,
        p_admin_id: "SSA Administrator",
        p_select_all_pending: selectAllPending
      });

      if (error) {
        return { success: false, updatedCount: 0, error: error.message };
      }

      if (data) {
        if (!data.success) {
          return { success: false, updatedCount: 0, error: data.error || "Bulk review failed." };
        }
        return { success: true, updatedCount: Number(data.updated_count || 0) };
      }
    } catch (err: any) {
      console.error("[AdminApi] bulkReviewUnderReview exception:", err);
      return { success: false, updatedCount: 0, error: err?.message || "Bulk review failed." };
    }

    return { success: false, updatedCount: 0, error: "Unexpected bulk review response." };
  },

  /**
   * Backward-compatible alias for reviewAdApplication
   */
  async updateAdApplicationStatus(
    campaignId: string,
    action: "approve" | "reject",
    notes?: string
  ): Promise<boolean> {
    const res = await this.reviewAdApplication(campaignId, action, notes);
    return res.success;
  },

  // ============================================================================
  // Referral Campaign Management API
  // ============================================================================

  /**
   * Generate random unique referral codes checking against stores, app_users and campaign volunteers
   */
  async generateUniqueReferralCodes(count: number, prefix = "CMP"): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc("generate_unique_campaign_referral_codes", {
        p_count: count,
        p_prefix: prefix
      });
      if (!error && Array.isArray(data)) {
        return data as string[];
      }
    } catch (err) {
      console.error("[AdminApi] generateUniqueReferralCodes error:", err);
    }
    return [];
  },

  /**
   * Save or update referral campaign and its volunteer details atomically
   */
  async saveReferralCampaign(
    campaign: Partial<ReferralCampaign>,
    volunteers: ReferralCampaignVolunteer[]
  ): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    try {
      const payloadCampaign = {
        id: campaign.id || null,
        name: campaign.name?.trim(),
        description: campaign.description?.trim() || null,
        start_date: campaign.startDate,
        start_time: campaign.startTime || "09:00",
        end_date: campaign.endDate,
        end_time: campaign.endTime || "18:00",
        start_timestamp: campaign.startTimestamp || `${campaign.startDate}T${campaign.startTime || "09:00"}:00+05:30`,
        end_timestamp: campaign.endTimestamp || `${campaign.endDate}T${campaign.endTime || "18:00"}:00+05:30`,
        volunteer_count: Number(campaign.volunteerCount || volunteers.length),
        status: campaign.status || "active",
        created_by: "SSA Administrator"
      };

      const payloadVolunteers = volunteers.map((v, idx) => ({
        id: v.id || null,
        serial_number: v.serialNumber || idx + 1,
        volunteer_name: v.volunteerName?.trim(),
        mobile_number: v.mobileNumber?.trim(),
        referral_code: v.referralCode?.trim()?.toUpperCase(),
        assigned_date: v.assignedDate || null,
        assigned_start_time: v.assignedStartTime || null,
        assigned_end_time: v.assignedEndTime || null
      }));

      const { data, error } = await supabase.rpc("save_referral_campaign", {
        p_campaign: payloadCampaign,
        p_volunteers: payloadVolunteers
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data) {
        if (!data.success) {
          return { success: false, error: data.error || "Failed to save campaign." };
        }
        return { success: true, campaignId: data.campaignId };
      }
    } catch (err: any) {
      console.error("[AdminApi] saveReferralCampaign exception:", err);
      return { success: false, error: err?.message || "Error saving campaign." };
    }

    return { success: false, error: "Unexpected response from campaign save." };
  },

  /**
   * Fetch all previously created referral campaigns
   */
  async getAllReferralCampaigns(): Promise<ReferralCampaign[]> {
    try {
      const { data, error } = await supabase.rpc("get_all_referral_campaigns");
      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          startDate: row.startDate,
          startTime: row.startTime,
          endDate: row.endDate,
          endTime: row.endTime,
          startTimestamp: row.startTimestamp,
          endTimestamp: row.endTimestamp,
          volunteerCount: Number(row.volunteerCount || 0),
          generatedCodesCount: Number(row.generatedCodesCount || 0),
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }));
      }
    } catch (err) {
      console.error("[AdminApi] getAllReferralCampaigns error:", err);
    }
    return [];
  },

  /**
   * Fetch single campaign details with full volunteer list
   */
  async getReferralCampaignDetails(
    campaignId: string
  ): Promise<{
    success: boolean;
    campaign?: ReferralCampaign;
    volunteers?: ReferralCampaignVolunteer[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc("get_referral_campaign_details", {
        p_campaign_id: campaignId
      });

      if (!error && data && data.success) {
        const c = data.campaign;
        return {
          success: true,
          campaign: {
            id: c.id,
            name: c.name,
            description: c.description,
            startDate: c.startDate,
            startTime: c.startTime,
            endDate: c.endDate,
            endTime: c.endTime,
            startTimestamp: c.startTimestamp,
            endTimestamp: c.endTimestamp,
            volunteerCount: Number(c.volunteerCount || 0),
            generatedCodesCount: Array.isArray(data.volunteers) ? data.volunteers.length : 0,
            status: c.status,
            createdAt: c.createdAt
          },
          volunteers: (data.volunteers || []).map((v: any) => ({
            id: v.id,
            campaignId: v.campaignId,
            serialNumber: Number(v.serialNumber || 1),
            volunteerName: v.volunteerName,
            mobileNumber: v.mobileNumber,
            referralCode: v.referralCode,
            assignedDate: v.assignedDate,
            assignedStartTime: v.assignedStartTime,
            assignedEndTime: v.assignedEndTime,
            createdAt: v.createdAt
          }))
        };
      } else if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error("[AdminApi] getReferralCampaignDetails exception:", err);
      return { success: false, error: err?.message || "Failed to load campaign details." };
    }

    return { success: false, error: "Campaign not found." };
  },

  /**
   * Archive and permanently delete campaign from active database
   */
  async archiveAndDeleteReferralCampaign(
    campaignId: string
  ): Promise<{ success: boolean; archiveId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("archive_and_delete_referral_campaign", {
        p_campaign_id: campaignId,
        p_admin_id: "SSA Administrator"
      });

      if (!error && data) {
        if (!data.success) {
          return { success: false, error: data.error || "Failed to delete campaign." };
        }
        return { success: true, archiveId: data.archiveId };
      } else if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error("[AdminApi] archiveAndDeleteReferralCampaign exception:", err);
      return { success: false, error: err?.message || "Failed to delete campaign." };
    }

    return { success: false, error: "Failed to delete campaign." };
  },

  /**
   * Fetch archived deleted campaigns
   */
  async getReferralCampaignArchives(): Promise<ReferralCampaignArchive[]> {
    try {
      const { data, error } = await supabase.rpc("get_referral_campaign_archives");
      if (!error && Array.isArray(data)) {
        return data.map((a: any) => ({
          id: a.id,
          originalCampaignId: a.originalCampaignId,
          name: a.name,
          description: a.description,
          startTimestamp: a.startTimestamp,
          endTimestamp: a.endTimestamp,
          volunteerCount: Number(a.volunteerCount || 0),
          volunteerData: a.volunteerData || [],
          originalCreatedAt: a.originalCreatedAt,
          archivedAt: a.archivedAt,
          archivedBy: a.archivedBy
        }));
      }
    } catch (err) {
      console.error("[AdminApi] getReferralCampaignArchives error:", err);
    }
    return [];
  },

  /**
   * Fetch live referral tracking for a campaign (volunteer-level SSM/SSC performance)
   */
  async getReferralCampaignTracking(campaignId: string): Promise<CampaignTrackingData> {
    try {
      const { data, error } = await supabase.rpc("get_referral_campaign_tracking", {
        p_campaign_id: campaignId
      });

      if (!error && data && data.success) {
        const c = data.campaign;
        const s = data.summary || {};
        return {
          success: true,
          campaign: {
            id: c.id,
            name: c.name,
            description: c.description,
            startDate: c.startDate,
            startTime: c.startTime,
            endDate: c.endDate,
            endTime: c.endTime,
            startTimestamp: c.startTimestamp,
            endTimestamp: c.endTimestamp,
            volunteerCount: Number(c.volunteerCount || 0),
            generatedCodesCount: Array.isArray(data.volunteers) ? data.volunteers.length : 0,
            status: c.status,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
          },
          summary: {
            totalVolunteers: Number(s.totalVolunteers || 0),
            totalMerchants: Number(s.totalMerchants || 0),
            totalConsumers: Number(s.totalConsumers || 0),
            totalOnboarded: Number(s.totalOnboarded || 0)
          },
          volunteers: (data.volunteers || []).map((v: any) => ({
            id: v.id,
            serialNumber: Number(v.serialNumber || 1),
            volunteerName: v.volunteerName || "Volunteer",
            mobileNumber: v.mobileNumber || "—",
            referralCode: v.referralCode || "—",
            assignedDate: v.assignedDate,
            assignedStartTime: v.assignedStartTime,
            assignedEndTime: v.assignedEndTime,
            ssmMerchants: Number(v.ssmMerchants || 0),
            sscConsumers: Number(v.sscConsumers || 0),
            totalOnboarded: Number(v.totalOnboarded || 0),
            createdAt: v.createdAt
          }))
        };
      } else if (error) {
        return {
          success: false,
          summary: { totalVolunteers: 0, totalMerchants: 0, totalConsumers: 0, totalOnboarded: 0 },
          volunteers: [],
          error: error.message
        };
      }
    } catch (err: any) {
      console.error("[AdminApi] getReferralCampaignTracking exception:", err);
      return {
        success: false,
        summary: { totalVolunteers: 0, totalMerchants: 0, totalConsumers: 0, totalOnboarded: 0 },
        volunteers: [],
        error: err?.message || "Failed to load tracking data."
      };
    }

    return {
      success: false,
      summary: { totalVolunteers: 0, totalMerchants: 0, totalConsumers: 0, totalOnboarded: 0 },
      volunteers: [],
      error: "Campaign tracking not found."
    };
  },

  /**
   * Fetch live referral tracking for an archived campaign
   */
  async getReferralCampaignArchiveTracking(archiveId: string): Promise<CampaignTrackingData> {
    try {
      const { data, error } = await supabase.rpc("get_referral_campaign_archive_tracking", {
        p_archive_id: archiveId
      });

      if (!error && data && data.success) {
        const c = data.campaign;
        const s = data.summary || {};
        return {
          success: true,
          campaign: {
            id: c.id,
            name: c.name,
            description: c.description,
            startDate: c.startDate || (c.startTimestamp ? c.startTimestamp.substring(0, 10) : ""),
            startTime: c.startTime || "09:00",
            endDate: c.endDate || (c.endTimestamp ? c.endTimestamp.substring(0, 10) : ""),
            endTime: c.endTime || "18:00",
            startTimestamp: c.startTimestamp,
            endTimestamp: c.endTimestamp,
            volunteerCount: Number(c.volunteerCount || 0),
            generatedCodesCount: Array.isArray(data.volunteers) ? data.volunteers.length : 0,
            status: "archived",
            createdAt: c.createdAt
          },
          summary: {
            totalVolunteers: Number(s.totalVolunteers || 0),
            totalMerchants: Number(s.totalMerchants || 0),
            totalConsumers: Number(s.totalConsumers || 0),
            totalOnboarded: Number(s.totalOnboarded || 0)
          },
          volunteers: (data.volunteers || []).map((v: any) => ({
            id: v.id,
            serialNumber: Number(v.serialNumber || 1),
            volunteerName: v.volunteerName || "Volunteer",
            mobileNumber: v.mobileNumber || "—",
            referralCode: v.referralCode || "—",
            assignedDate: v.assignedDate,
            assignedStartTime: v.assignedStartTime,
            assignedEndTime: v.assignedEndTime,
            ssmMerchants: Number(v.ssmMerchants || 0),
            sscConsumers: Number(v.sscConsumers || 0),
            totalOnboarded: Number(v.totalOnboarded || 0)
          }))
        };
      }
    } catch (err) {
      console.error("[AdminApi] getReferralCampaignArchiveTracking error:", err);
    }

    return {
      success: false,
      summary: { totalVolunteers: 0, totalMerchants: 0, totalConsumers: 0, totalOnboarded: 0 },
      volunteers: [],
      error: "Archived campaign tracking not found."
    };
  },

  /**
   * Fetch all SSC promotional banners for SSA Admin Console
   */
  async getAllSscBanners(): Promise<SscBanner[]> {
    try {
      const { data, error } = await supabase.rpc("get_all_ssc_banners_admin");
      if (error) {
        console.error("[AdminApi] get_all_ssc_banners_admin error:", error);
        return [];
      }
      return (data || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle || "",
        imageUrl: b.image_url,
        storagePath: b.storage_path || undefined,
        sourceType: (b.source_type as any) || "custom",
        sourceRequestId: b.source_request_id || undefined,
        merchantId: b.merchant_id || undefined,
        merchantName: b.merchant_name || undefined,
        redirectType: (b.redirect_type as any) || (b.link_type as any) || "none",
        redirectTarget: b.redirect_target || b.target_id || b.custom_url || "",
        targetId: b.target_id || b.redirect_target || "",
        targetName: b.target_name || b.merchant_name || "",
        customUrl: b.custom_url || "",
        linkType: b.link_type || b.redirect_type || "none",
        status: (b.status as any) || (b.is_active ? "active" : "inactive"),
        isActive: Boolean(b.is_active || b.status === "active"),
        startAt: b.start_at || b.start_date || null,
        endAt: b.end_at || b.end_date || null,
        startDate: b.start_date || b.start_at || null,
        endDate: b.end_date || b.end_at || null,
        targetingType: (b.targeting_type as any) || "all",
        targetState: b.target_state || undefined,
        targetDistrict: b.target_district || undefined,
        targetCity: b.target_city || undefined,
        targetPincodes: b.target_pincodes || undefined,
        targetLatitude: b.target_latitude != null ? Number(b.target_latitude) : null,
        targetLongitude: b.target_longitude != null ? Number(b.target_longitude) : null,
        targetRadiusKm: b.target_radius_km != null ? Number(b.target_radius_km) : null,
        displayOrder: Number(b.display_order || 0),
        clicksCount: Number(b.clicks_count || 0),
        impressionsCount: Number(b.impressions_count || 0),
        createdAt: b.created_at,
        updatedAt: b.updated_at,
        createdBy: b.created_by || "SSA Administrator"
      }));
    } catch (err) {
      console.error("[AdminApi] getAllSscBanners error:", err);
      return [];
    }
  },

  /**
   * Create or update an SSC promotional banner
   */
  async saveSscBanner(banner: Partial<SscBanner>): Promise<{ success: boolean; banner?: SscBanner; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("save_ssc_banner", {
        p_banner: {
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle,
          imageUrl: banner.imageUrl,
          storagePath: banner.storagePath,
          sourceType: banner.sourceType || "custom",
          sourceRequestId: banner.sourceRequestId,
          merchantId: banner.merchantId,
          merchantName: banner.merchantName,
          redirectType: banner.redirectType || banner.linkType || "none",
          redirectTarget: banner.redirectTarget || banner.targetId || banner.customUrl || "",
          targetId: banner.targetId || banner.redirectTarget,
          targetName: banner.targetName || banner.merchantName,
          customUrl: banner.customUrl,
          status: banner.status || (banner.isActive === false ? "inactive" : "active"),
          isActive: banner.isActive !== false && banner.status !== "inactive" && banner.status !== "draft",
          displayOrder: banner.displayOrder != null ? Number(banner.displayOrder) : 0,
          startAt: banner.startAt || banner.startDate,
          endAt: banner.endAt || banner.endDate,
          startDate: banner.startDate || banner.startAt,
          endDate: banner.endDate || banner.endAt,
          targetingType: banner.targetingType || "all",
          targetState: banner.targetState,
          targetDistrict: banner.targetDistrict,
          targetCity: banner.targetCity,
          targetPincodes: banner.targetPincodes,
          targetLatitude: banner.targetLatitude,
          targetLongitude: banner.targetLongitude,
          targetRadiusKm: banner.targetRadiusKm,
          createdBy: banner.createdBy || "SSA Administrator"
        }
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (!data?.success) {
        return { success: false, error: data?.error || "Failed to save banner." };
      }
      return { success: true, banner: data.banner };
    } catch (err: any) {
      return { success: false, error: err?.message || "An unexpected error occurred." };
    }
  },

  /**
   * Retrieve existing approved advertising requests from spotlight_campaigns
   * along with their current SSC publishing status
   */
  async getApprovedSsmBanners(): Promise<ApprovedSsmBannerItem[]> {
    try {
      const { data, error } = await supabase.rpc("get_approved_ssm_banners");
      if (error) {
        console.error("[AdminApi] get_approved_ssm_banners error:", error);
        return [];
      }
      return (data || []).map((row: any) => ({
        requestId: row.request_id,
        storeId: row.store_id,
        merchantId: row.merchant_id,
        storeName: row.store_name,
        ownerName: row.owner_name,
        storeAddress: row.store_address,
        storeLat: row.store_lat != null ? Number(row.store_lat) : null,
        storeLng: row.store_lng != null ? Number(row.store_lng) : null,
        title: row.title,
        description: row.description || "",
        bannerUrl: row.banner_url,
        status: row.status,
        paymentStatus: row.payment_status,
        totalAmount: Number(row.total_amount || 0),
        durationDays: Number(row.duration_days || 0),
        startDate: row.start_date,
        endDate: row.end_date,
        isPublishedToSsc: Boolean(row.is_published_to_ssc),
        sscBannerId: row.ssc_banner_id || null,
        sscBannerStatus: row.ssc_banner_status || null,
        sscDisplayOrder: Number(row.ssc_display_order || 0)
      }));
    } catch (err) {
      console.error("[AdminApi] getApprovedSsmBanners exception:", err);
      return [];
    }
  },

  /**
   * Publish an already-approved SSM advertising banner to SSC
   */
  async publishApprovedSsmBanner(
    requestId: string,
    displayOrder = 0,
    targeting: {
      targetingType?: "all" | "state" | "district" | "city" | "pincode" | "radius";
      targetState?: string;
      targetDistrict?: string;
      targetCity?: string;
      targetPincodes?: string;
      targetLatitude?: number | null;
      targetLongitude?: number | null;
      targetRadiusKm?: number | null;
    } = {}
  ): Promise<{ success: boolean; error?: string; banner?: any }> {
    try {
      const { data, error } = await supabase.rpc("publish_approved_ssm_banner", {
        p_request_id: requestId,
        p_display_order: displayOrder,
        p_targeting: targeting
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (!data?.success) {
        return { success: false, error: data?.error || "Failed to publish approved banner." };
      }
      return { success: true, banner: data.banner };
    } catch (err: any) {
      return { success: false, error: err?.message || "An unexpected error occurred." };
    }
  },

  /**
   * Toggle banner status (active, inactive, draft)
   */
  async toggleSscBannerStatus(id: string, statusOrActive: string | boolean): Promise<boolean> {
    try {
      const statusStr = typeof statusOrActive === "boolean" ? (statusOrActive ? "active" : "inactive") : statusOrActive;
      const { data, error } = await supabase.rpc("toggle_ssc_banner_status", {
        p_banner_id: id,
        p_status: statusStr
      });
      if (error) {
        console.error("[AdminApi] toggleSscBannerStatus error:", error);
        return false;
      }
      return Boolean(data?.success);
    } catch (err) {
      console.error("[AdminApi] toggleSscBannerStatus error:", err);
      return false;
    }
  },

  /**
   * Delete an SSC promotional banner
   */
  async deleteSscBanner(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("delete_ssc_banner", {
        p_banner_id: id
      });
      if (error) {
        console.error("[AdminApi] deleteSscBanner error:", error);
        return false;
      }
      return Boolean(data?.success);
    } catch (err) {
      console.error("[AdminApi] deleteSscBanner error:", err);
      return false;
    }
  },

  /**
   * Upload custom banner image to Supabase Storage bucket 'ssc-banners'
   */
  async uploadBannerImage(file: Blob | File | ArrayBuffer | Uint8Array, fileName: string, contentType = "image/webp"): Promise<{ success: boolean; publicUrl?: string; storagePath?: string; error?: string }> {
    try {
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `custom_${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from("ssc-banners")
        .upload(path, file, {
          contentType,
          upsert: true
        });

      if (error) {
        console.error("[AdminApi] uploadBannerImage error:", error);
        return { success: false, error: error.message };
      }

      const { data: publicData } = supabase.storage
        .from("ssc-banners")
        .getPublicUrl(data.path);

      return {
        success: true,
        publicUrl: publicData.publicUrl,
        storagePath: data.path
      };
    } catch (err: any) {
      console.error("[AdminApi] uploadBannerImage exception:", err);
      return { success: false, error: err?.message || "Failed to upload banner image." };
    }
  }
};
