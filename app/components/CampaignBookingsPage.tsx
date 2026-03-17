import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import type { action, loader } from "app/routes/app.campaign-bookings";

type CampaignVehicle = {
  vehicleNumber: string;
  vehicleMake: string;
  vehicleModel: string;
};

type CampaignBooking = {
  _id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  store: string;
  date: string;
  numVehicles: number;
  vehicles: CampaignVehicle[];
  amount: number;
  status: "pending" | "paid" | "failed";
  emailSent: boolean;
  createdAt: string;
  updatedAt?: string;
};

const PAGE_LIMIT = 10;

type OverlayModalElement = {
  showOverlay?: () => void;
};

type SwitchChangeEvent = {
  currentTarget: {
    checked?: boolean;
  };
};

type SearchInputEvent = {
  currentTarget: {
    value?: string;
  };
};

function formatDate(date: string) {
  if (!date) return "-";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatDateTime(date: string) {
  if (!date) return "-";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function formatCurrency(amount: number) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function CampaignBookingsPage() {
  const { showCampaignPage, pageFound, menuFound, isPagePublished, isMenuVisible } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const viewModalRef: any = useRef<OverlayModalElement | null>(null);

  const [bookings, setBookings] = useState<CampaignBooking[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<CampaignBooking | null>(null);
  const [campaignVisibleOnStorefront, setCampaignVisibleOnStorefront] = useState(showCampaignPage);

  const totalPages = useMemo(() => Math.max(Math.ceil(total / PAGE_LIMIT), 1), [total]);
  const isSubmittingVisibility =
    navigation.state === "submitting" && navigation.formData?.get("actionType") === "UPDATE_CAMPAIGN_VISIBILITY";

  const fetchPage = useCallback(async (targetPage: number, searchTerm: string) => {
    setTableLoading(true);

    try {
      const params: Record<string, string> = {
        page: String(targetPage),
        limit: String(PAGE_LIMIT),
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await fetch(`/api/campaign-bookings`, {
        method: "POST",
        body: JSON.stringify(params)
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message);
      }
      console.log("json................", json);
      if (json.success) {
        setBookings(json.data);
        setTotal(json.total);
        setPage(json.page);
      } else {
        setBookings([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Failed to fetch campaign bookings", error);
      setBookings([]);
      setTotal(0);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, appliedSearch);
  }, [fetchPage, appliedSearch]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!actionData) return;

    if (typeof actionData.showCampaignPage === "boolean") {
      setCampaignVisibleOnStorefront(actionData.showCampaignPage);
    } else {
      setCampaignVisibleOnStorefront(showCampaignPage);
    }

    if (actionData.success) {
      if (actionData.message) {
        shopify.toast.show(actionData.message);
      }
      return;
    }

    if (actionData.message) {
      shopify.toast.show(actionData.message, { isError: true });
    }
  }, [actionData, showCampaignPage]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    fetchPage(nextPage, appliedSearch);
  };

  const handleViewBooking = (booking: CampaignBooking) => {
    setSelectedBooking(booking);
    viewModalRef.current?.showOverlay?.();
  };

  const handleToggleStorefrontVisibility = (checked: boolean) => {
    setCampaignVisibleOnStorefront(checked);

    const formData = new FormData();
    formData.append("actionType", "UPDATE_CAMPAIGN_VISIBILITY");
    formData.append("showCampaignPage", checked ? "true" : "false");
    submit(formData, { method: "post" });
  };

  return (
    <s-page heading="Campaign Bookings">
      <div
        style={{
          marginBottom: "1.5rem",
          marginTop: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <s-heading>Storefront Visibility</s-heading>
          <div style={{ marginTop: "0.25rem" }}>
            <s-text>Show or hide the actual Shopify page and its linked menu item together.</s-text>
          </div>
          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <s-text>
              Page status: {pageFound ? (isPagePublished ? "Published" : "Hidden") : 'Missing "Campaign Booking" page'}
            </s-text>
            <s-text>
              Menu status: {menuFound ? (isMenuVisible ? "Visible" : "Hidden") : "Missing menu 223428149482"}
            </s-text>
          </div>
        </div>

        <s-switch
          label="Show campaign page and menu on storefront"
          labelAccessibilityVisibility="exclusive"
          checked={campaignVisibleOnStorefront}
          onChange={(event: SwitchChangeEvent) => handleToggleStorefrontVisibility(Boolean(event.currentTarget.checked))}
          disabled={isSubmittingVisibility || !pageFound || !menuFound}
        />
      </div>

      <s-section padding="none">
        <div style={{ marginBottom: "1rem", padding: "0.5rem" }}>
          <s-search-field
            label="Search bookings"
            value={search}
            placeholder="Search by customer, city, store, date, status or Razorpay ID"
            onInput={(event: SearchInputEvent) => setSearch(event.currentTarget.value || "")}
          />
        </div>

        {tableLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
            <s-spinner />
          </div>
        ) : (
          <s-table
            paginate
            hasPreviousPage={page > 1}
            hasNextPage={page < totalPages}
            onPreviousPage={() => handlePageChange(page - 1)}
            onNextPage={() => handlePageChange(page + 1)}
          >
            <s-table-header-row>
              <s-table-header listSlot="primary">Customer</s-table-header>
              <s-table-header listSlot="inline">Store</s-table-header>
              <s-table-header listSlot="secondary">Booking Date</s-table-header>
              <s-table-header format="currency">Amount</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>

            <s-table-body>
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <s-table-row key={booking._id}>
                    <s-table-cell>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <s-text type="strong">{booking.name}</s-text>
                        <s-text>{booking.email}</s-text>
                        <s-text>{booking.mobile}</s-text>
                      </div>
                    </s-table-cell>
                    <s-table-cell>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <s-text>{booking.city}</s-text>
                        <s-text>{booking.store}</s-text>
                      </div>
                    </s-table-cell>
                    <s-table-cell>{formatDate(booking.date)}</s-table-cell>
                    <s-table-cell>{formatCurrency(booking.amount)}</s-table-cell>
                    <s-table-cell>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <s-text>{booking.status}</s-text>
                        <s-text>{booking.emailSent ? "Email sent" : "Email pending"}</s-text>
                      </div>
                    </s-table-cell>
                    <s-table-cell>
                      <s-button onClick={() => handleViewBooking(booking)}>View</s-button>
                    </s-table-cell>
                  </s-table-row>
                ))
              ) : (
                <s-table-row>
                  <s-table-cell>
                    <s-text>No bookings found.</s-text>
                  </s-table-cell>
                </s-table-row>
              )}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <s-text>
          Page {page} of {totalPages}
        </s-text>
        <s-text>Total {total} booking(s)</s-text>
      </div>

      <s-modal
        id="campaign-booking-view-modal"
        ref={viewModalRef}
        accessibilityLabel="campaign-booking-view-modal"
        heading={selectedBooking ? `Booking: ${selectedBooking.name}` : "Booking details"}
        onHide={() => setSelectedBooking(null)}
      >
        {selectedBooking ? (
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <s-heading>Customer Details</s-heading>
              <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.4rem" }}>
                <s-text>Name: {selectedBooking.name}</s-text>
                <s-text>Email: {selectedBooking.email}</s-text>
                <s-text>Mobile: {selectedBooking.mobile}</s-text>
              </div>
            </div>

            <div>
              <s-heading>Booking Details</s-heading>
              <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.4rem" }}>
                <s-text>Booking Date: {formatDate(selectedBooking.date)}</s-text>
                <s-text>City: {selectedBooking.city}</s-text>
                <s-text>Store: {selectedBooking.store}</s-text>
                <s-text>Vehicles: {selectedBooking.numVehicles}</s-text>
                <s-text>Amount: {formatCurrency(selectedBooking.amount)}</s-text>
                <s-text>Status: {selectedBooking.status}</s-text>
                <s-text>Email Sent: {selectedBooking.emailSent ? "Yes" : "No"}</s-text>
                <s-text>Created At: {formatDateTime(selectedBooking.createdAt)}</s-text>
              </div>
            </div>

            <div>
              <s-heading>Payment Details</s-heading>
              <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.4rem" }}>
                <s-text>Order ID: {selectedBooking.razorpay_order_id || "-"}</s-text>
                <s-text>Payment ID: {selectedBooking.razorpay_payment_id || "-"}</s-text>
              </div>
            </div>

            <div>
              <s-heading>Vehicle Details</s-heading>
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {selectedBooking.vehicles?.length ? (
                  selectedBooking.vehicles.map((vehicle, index) => (
                    <div
                      key={`${vehicle.vehicleNumber}-${index}`}
                      style={{
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                        borderRadius: "8px",
                        padding: "0.75rem",
                        display: "grid",
                        gap: "0.25rem",
                      }}
                    >
                      <s-text type="strong">Vehicle {index + 1}</s-text>
                      <s-text>Number: {vehicle.vehicleNumber || "-"}</s-text>
                      <s-text>Make: {vehicle.vehicleMake || "-"}</s-text>
                      <s-text>Model: {vehicle.vehicleModel || "-"}</s-text>
                    </div>
                  ))
                ) : (
                  <s-text>No vehicle details available.</s-text>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 1rem 1rem" }}>
          <s-button commandFor="campaign-booking-view-modal" command="--hide">
            Close
          </s-button>
        </div>
      </s-modal>
    </s-page>
  );
}
