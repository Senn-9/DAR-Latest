"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ProcurementPage() {
  const supabase = createClient();
  type PRItem = { description: string } //pr_item table
  type PRListRow = { entity_name: string; pr_num: string; pr_item?: PRItem[] } //pr_form table with pr_item relation
  type ItemDataType = {
    stock_num: string;
    unit: string;
    description: string;
    quantity: string;
    unit_cost: string;
    total_cost: string;
    created_at: string;
  }

  type CurrentUser = {
    username: string;
    user_id: string;
    role_id: number;
    divisions?: { division_name: string };
    roles?: { role_name: string };
  }

  const [formData, setFormData] = useState({
    entity_name: "",
    fund_cluster: "",
    office_section: "",
    pr_num: "",
    responsibility_code: "",
    purpose: "",
    req_by: "",
    req_designation: "",
    app_by: "",
    app_designation: "",
  });

  const [items, setItems] = useState<ItemDataType[]>([{
    stock_num: "",
    unit: "",
    description: "",
    quantity: "",
    unit_cost: "",
    total_cost: "",
    created_at: new Date().toISOString()
  }]);

  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch logged-in user from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAdmin(user.role_id === 1);
    }
  }, []);

  const addItem = () => {
    setItems([...items, {
      stock_num: "",
      unit: "",
      description: "",
      quantity: "",
      unit_cost: "",
      total_cost: "",
      created_at: new Date().toISOString()
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ItemDataType, value: string) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const handleSubmit = async () => {
    setLoading(true);

    const { data: formResult, error: formError } = await supabase
      .from("pr_form")
      .insert([formData])
      .select()
      .single(); 

    if (formError) {
      alert("Error saving data: " + formError.message);
      setLoading(false);
      return;
    }

    const itemsToInsert = items.map(item => ({ ...item, pr_id: formResult.pr_id }));
    const { error: itemError } = await supabase
      .from("pr_item")
      .insert(itemsToInsert);

    if (itemError) {
      alert("Form saved but error saving items: " + itemError.message);
    } else {
      alert("Data saved successfully!");
      setFormData({
        entity_name: "",
        fund_cluster: "",
        office_section: "",
        pr_num: "",
        responsibility_code: "",
        purpose: "",
        req_by: "",
        req_designation: "",
        app_by: "",
        app_designation: "",
      });
      setItems([{
        stock_num: "",
        unit: "",
        description: "",
        quantity: "",
        unit_cost: "",
        total_cost: "",
        created_at: new Date().toISOString()
      }]);
    }

    setLoading(false);
  };

  const [list, setList] = useState<PRListRow[]>([]);
  useEffect(() => {
    const fetchPRData = async () => {
      const { data, error } = await supabase
        .from("pr_form")
        .select(`
          entity_name,
          pr_num,
          pr_item (
            description
            )
        `)
        

      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setList((data || []) as PRListRow[]);
      }

    };
    fetchPRData();
  }, [supabase]);

  return (

    <div className="p-8 max-w-4xl mx-auto space-y-6 text-black">
      
      {/* Logged-in User Credentials Display */}
      {currentUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-blue-900">Logged in as:</p>
          <p className="text-lg font-bold text-blue-800">{currentUser.username}</p>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <span className="font-semibold">User ID:</span> {currentUser.user_id}
            </div>
            <div>
              <span className="font-semibold">Division:</span> {currentUser.divisions?.division_name || "N/A"}
            </div>
            <div>
              <span className="font-semibold">Role:</span> {currentUser.roles?.role_name || "N/A"}
            </div>
          </div>
        </div>
      )}

      {/* Role-Based Admin Button */}
      {currentUser && (
        <div className="mb-6">
          <button
            disabled={!isAdmin}
            className={`px-6 py-3 rounded font-bold transition-colors ${
              isAdmin
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-gray-400 text-gray-600 cursor-not-allowed"
            }`}
          >
            {isAdmin ? "Admin Panel" : "Admin Only (Disabled)"}
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">Procurement Request Form</h1>


      {/* pr_form table */}
      <div className="grid grid-cols-2 gap-4 border-b pb-6">
        <input className="border p-2"
          placeholder="Entity Name"
          value={formData.entity_name}
          onChange={(e) => setFormData({...formData, entity_name: e.target.value})} />

        <input className="border p-2"
          placeholder="PR Number"
          value={formData.pr_num}
          onChange={(e) => setFormData({...formData, pr_num: e.target.value})} />

        <input className="border p-2"
          placeholder="Fund Cluster"
          value={formData.fund_cluster}
          onChange={(e) => setFormData({...formData, fund_cluster: e.target.value})} />

        <input className="border p-2"
          placeholder="Office Section"
          value={formData.office_section}
          onChange={(e) => setFormData({...formData, office_section: e.target.value})} />

        <input className="border p-2"
          placeholder="Responsibility Code"
          value={formData.responsibility_code}
          onChange={(e) => setFormData({...formData, responsibility_code: e.target.value})} />

        <input className="border p-2"
          placeholder="Purpose"
          value={formData.purpose}
          onChange={(e) => setFormData({...formData, purpose: e.target.value})} />

        <input className="border p-2"
          placeholder="Requested By"
          value={formData.req_by}
          onChange={(e) => setFormData({...formData, req_by: e.target.value})} />

        <input className="border p-2"
          placeholder="Requested Designation"
          value={formData.req_designation}
          onChange={(e) => setFormData({...formData, req_designation: e.target.value})} />

        <input className="border p-2"
          placeholder="Approved By"
          value={formData.app_by}
          onChange={(e) => setFormData({...formData, app_by: e.target.value})} />

        <input className="border p-2"
          placeholder="Approved Designation"
          value={formData.app_designation}
          onChange={(e) => setFormData({...formData, app_designation: e.target.value})} />

      </div>


      {/* pr_item table - Multiple Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Procurement Items</h2>
          <button
            onClick={addItem}
            disabled={!isAdmin}
            className="disabled:bg-gray-400 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Add Item
          </button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-2 gap-4 border p-4 rounded bg-gray-50 relative">
            <div className="absolute top-2 right-2">
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800 p-1 text-lg font-bold">
                  ×
                </button>
              )}
            </div>

            <input 
              className="border p-2"
              // disabled={!isAdmin}
              placeholder="Stock Number"
              value={item.stock_num}
              onChange={(e) => updateItem(index, 'stock_num', e.target.value)} />

            <input 
              className="border p-2"
              placeholder="Unit"
              value={item.unit}
              onChange={(e) => updateItem(index, 'unit', e.target.value)} />

            <input 
              className="border p-2 col-span-2"
              placeholder="Description"
              value={item.description}
              onChange={(e) => updateItem(index, 'description', e.target.value)} />

            <input 
              className="border p-2"
              placeholder="Quantity"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', e.target.value)} />

            <input 
              className="border p-2"
              placeholder="Unit Cost"
              value={item.unit_cost}
              onChange={(e) => updateItem(index, 'unit_cost', e.target.value)} />

            <input 
              className="border p-2"
              placeholder="Total Cost"
              value={item.total_cost}
              onChange={(e) => updateItem(index, 'total_cost', e.target.value)} />

            <input 
              className="border p-2"
              placeholder="Created At"
              type="date"
              value={item.created_at.split('T')[0]}
              onChange={(e) => updateItem(index, 'created_at', e.target.value)} />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !isAdmin}
        className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 disabled:bg-gray-400">
          {loading ? "Saving..." : "Submit Procurement Request"}
        </button>


      <h2 className="text-xl font-bold mb-4">Purchase Request Overview</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">

          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Entity Name</th>
              <th className="border p-2 text-left">PR Number</th>
              <th className="border p-2 text-left">Items / Descriptions</th>
            </tr>
          </thead>

          <tbody>
            {list.map((form, index) => (
              <tr key={index} className="border-b">
                <td className="border p-2 font-medium">{form.entity_name}</td>
                <td className="border p-2">{form.pr_num}</td>
                <td className="border p-2 text-sm text-gray-600">
                  {form.pr_item && form.pr_item.length > 0
                    ? form.pr_item.map((item: any) => item.description).join(", ") : "No items"}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>

  );

};