import { useState, useEffect, useRef, useCallback } from "react";
import type { ActionFunctionArgs } from "react-router";
import { useActionData, useNavigation, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import StorePrice from "../MongoDB/models/StorePrice";

export const action = async ({ request }: ActionFunctionArgs) => {
    await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    try {
        if (actionType === "CREATE") {
            const city = (formData.get("city") as string)?.trim();
            const priceStr = formData.get("price") as string;
            const price = parseFloat(priceStr);
            const stores = formData.getAll("stores[]").map(s => (s as string).trim()).filter(Boolean);

            if (!city) return { success: false, message: "City is required", errors: { city: "City is required" } };
            if (isNaN(price) || price <= 0) return { success: false, message: "Invalid price", errors: { price: "Price must be greater than 0" } };
            if (stores.length === 0) return { success: false, message: "At least one store is required", errors: { stores: "At least one store is required" } };

            await StorePrice.create({
                city,
                price,
                stores,
            });
            return { success: true, message: "Record created successfully" };
        }

        if (actionType === "UPDATE") {
            const id = formData.get("id");
            const priceStr = formData.get("price") as string;
            const price = parseFloat(priceStr);
            const stores = formData.getAll("stores[]").map(s => (s as string).trim()).filter(Boolean);

            if (isNaN(price) || price <= 0) return { success: false, message: "Invalid price", errors: { price: "Price must be greater than 0" } };
            if (stores.length === 0) return { success: false, message: "At least one store is required", errors: { stores: "At least one store is required" } };

            await StorePrice.findByIdAndUpdate(id, {
                price,
                stores,
            });
            return { success: true, message: "Record updated successfully" };
        }

        if (actionType === "DELETE") {
            const id = formData.get("id");
            await StorePrice.findByIdAndDelete(id);
            return { success: true, message: "Record deleted successfully" };
        }
    } catch (error: any) {
        return { success: false, message: error.message };
    }

    return { success: false, message: "Invalid action" };
};

const PAGE_LIMIT = 10;

export default function StorePrices() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const submit = useSubmit();

    const formModalRef = useRef<any>(null);
    const deleteModalRef = useRef<any>(null);

    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [tableLoading, setTableLoading] = useState(false);

    const [formState, setFormState] = useState({ city: "", price: "" });
    const [stores, setStores] = useState([""]);
    const [errors, setErrors] = useState<any>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const totalPages = Math.ceil(total / PAGE_LIMIT);

    const fetchPage = useCallback(async (targetPage: number) => {
        setTableLoading(true);
        try {
            const res = await fetch(
                `/api/store-prices?page=${targetPage}&limit=${PAGE_LIMIT}`
            );
            const json = await res.json();
            if (json.success) {
                setItems(json.data);
                setTotal(json.total);
                setPage(json.page);
            }
        } catch (err) {
            console.error("Failed to fetch store prices", err);
        } finally {
            setTableLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(1);
    }, [fetchPage]);

    useEffect(() => {
        if (actionData?.success) {
            formModalRef.current?.hideOverlay?.();
            deleteModalRef.current?.hideOverlay?.();
            shopify.toast.show(actionData.message);
            resetForm();
            fetchPage(page);
        }
    }, [actionData]);

    const resetForm = () => {
        setFormState({ city: "", price: "" });
        setStores([""]);
        setErrors({});
        setEditingId(null);
        setItemToDelete(null);
    };

    const openAddModal = () => {
        resetForm();
        formModalRef.current?.showOverlay?.();
    };

    const handleEdit = (item: any) => {
        setEditingId(item._id);
        setFormState({ city: item.city, price: item.price.toString() });
        setStores(item.stores?.length ? item.stores : [""]);
        formModalRef.current?.showOverlay?.();
    };

    const handleAddStore = () => setStores([...stores, ""]);

    const handleStoreChange = (index: number, value: string) => {
        const updated = [...stores];
        updated[index] = value;
        setStores(updated);
    };

    const handleDeleteClick = (id: string) => {
        setItemToDelete(id);
        deleteModalRef.current?.showOverlay?.();
    };

    const handleSubmit = () => {
        const newErrors: any = {};
        if (!editingId && !formState.city.trim()) newErrors.city = "City is required";
        const priceNum = parseFloat(formState.price);
        if (isNaN(priceNum) || priceNum <= 0) newErrors.price = "Price must be greater than 0";
        if (stores.every(s => !s.trim())) newErrors.stores = "At least one store is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const formData = new FormData();
        formData.append("actionType", editingId ? "UPDATE" : "CREATE");
        if (editingId) formData.append("id", editingId);
        formData.append("city", formState.city.trim());
        formData.append("price", formState.price);
        stores.forEach(store => {
            if (store.trim()) formData.append("stores[]", store.trim());
        });
        submit(formData, { method: "post" });
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            submit({ actionType: "DELETE", id: itemToDelete }, { method: "post" });
        }
    };

    const changePage = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        fetchPage(newPage);
    };

    return (
        <s-page heading="Store Price Management">
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <s-button onClick={openAddModal} variant="primary">Add Location</s-button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <s-heading>Store Prices</s-heading>
            </div>

            <s-section padding="none">
                {tableLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <s-spinner />
                    </div>
                ) : (
                    <s-table
                        paginate
                        hasPreviousPage={page > 1}
                        hasNextPage={page < totalPages}
                        onPreviousPage={() => changePage(page - 1)}
                        onNextPage={() => changePage(page + 1)}
                    >
                        <s-table-header-row>
                            <s-table-header listSlot="primary">City</s-table-header>
                            <s-table-header listSlot="inline">Stores</s-table-header>
                            <s-table-header listSlot="secondary" format="currency">Price</s-table-header>
                            <s-table-header>Actions</s-table-header>
                        </s-table-header-row>

                        <s-table-body>
                            {items.map((item: any) => (
                                <s-table-row key={item._id}>
                                    <s-table-cell>{item.city}</s-table-cell>
                                    <s-table-cell>{Array.isArray(item.stores) ? item.stores.join(", ") : ""}</s-table-cell>
                                    <s-table-cell>₹{item.price}</s-table-cell>
                                    <s-table-cell>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <s-button onClick={() => handleEdit(item)}>Edit</s-button>
                                            <s-button tone="critical" onClick={() => handleDeleteClick(item._id)}>Delete</s-button>
                                        </div>
                                    </s-table-cell>
                                </s-table-row>
                            ))}
                        </s-table-body>
                    </s-table>
                )}
            </s-section>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                <s-text>Page {page} of {totalPages} (Total {total} records)</s-text>
            </div>

            <s-modal id="form-modal" accessibilityLabel="form-modal" ref={formModalRef} heading={editingId ? "Edit Store Price" : "Add Store Price"} onHide={resetForm}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                    <s-text-field
                        label="City"
                        value={formState.city}
                        disabled={!!editingId}
                        onInput={(e: any) => {
                            setFormState({ ...formState, city: e.target.value });
                            if (errors.city) setErrors({ ...errors, city: null });
                        }}
                        placeholder="Enter City"
                        error={errors.city}
                    ></s-text-field>
                    <s-number-field
                        label="Price"
                        value={formState.price}
                        onInput={(e: any) => {
                            setFormState({ ...formState, price: e.target.value });
                            if (errors.price) setErrors({ ...errors, price: null });
                        }}
                        placeholder="Enter Price"
                        error={errors.price}
                    ></s-number-field>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <s-text type="strong">Stores</s-text>
                        {errors.stores && <s-text tone="critical">{errors.stores}</s-text>}
                    </div>
                    {stores.map((store, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <s-text-field
                                    label={`Store ${index + 1}`}
                                    value={store}
                                    onInput={(e: any) => {
                                        handleStoreChange(index, e.target.value);
                                        if (errors.stores) setErrors({ ...errors, stores: null });
                                    }}
                                    placeholder="Enter Store Name"
                                ></s-text-field>
                            </div>
                            {stores.length > 1 && (
                                <s-button tone="critical" onClick={() => {
                                    const updatedStores = stores.filter((_, i) => i !== index);
                                    setStores(updatedStores);
                                    if (updatedStores.length > 0 && errors.stores) setErrors({ ...errors, stores: null });
                                }}>Remove</s-button>
                            )}
                        </div>
                    ))}
                    <s-button onClick={handleAddStore}>Add Store</s-button>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <s-button
                        variant="primary"
                        onClick={handleSubmit}
                        loading={navigation.state === "submitting"}
                    >
                        {editingId ? "Update" : "Save"}
                    </s-button>
                    <s-button
                        onClick={resetForm}
                        commandFor="form-modal"
                        command="--hide"
                    >
                        Cancel
                    </s-button>
                </div>
            </s-modal>

            <s-modal id="delete-modal" accessibilityLabel="delete-modal" ref={deleteModalRef} heading="Confirm Delete" onHide={resetForm}>
                <div style={{ padding: '0.5rem' }}>
                    <s-text>Are you sure you want to delete this store price entry? This action cannot be undone.</s-text>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <s-button
                        onClick={resetForm}
                        commandFor="delete-modal"
                        command="--hide"
                    >
                        Cancel
                    </s-button>
                    <s-button
                        tone="critical"
                        onClick={confirmDelete}
                        loading={navigation.state === "submitting"}
                    >
                        Delete
                    </s-button>
                </div>
            </s-modal>
        </s-page>
    );
}
