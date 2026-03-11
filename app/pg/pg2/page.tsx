"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

// type PRform = {
//   pr_id: number;
//   entity_name: string;
//   fund_cluster: string;
//   office_section: string;
//   pr_num: string;
//   responsibility_code: string;
//   created_at: string;
// };

// type PRitems = {
//   prItem_id: number;
//   pr_id: number;
//   created_at: string;
//   stock_num: string;
//   unit: string;
//   description: string;
//   quantity: string;
//   unit_cost: string;
//   total_cost: string;
// };

export default function ProcurementPage() {
  const supabase = createClient();
  type PRItem = { description: string } //pr_item table
  type PRListRow = { entity_name: string; pr_num: string; pr_item?: PRItem[] } //pr_form table with pr_item relation

  const [formData, setFormData] = useState({
    entity_name: "",
    fund_cluster: "",
    office_section: "",
    pr_num: "",
    responsibility_code: "",
  });

  const [itemData, setItemData] = useState({
    stock_num: "",
    unit: "",
    description: "",
    quantity: "",
    unit_cost: "",
    // total_cost: "",
  });

  const [loading, setLoading] = useState(false);

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

    const { error: itemError } = await supabase
      .from("pr_item")
      .insert([{ ...itemData, pr_id: formResult.pr_id }]);

    if (itemError) {
      alert("Error form save but not the items: " + itemError.message);
    } else {
      alert("Data saved successfully!");
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

    <div className="p-8 max-w-2xl mx-auto space-y-6 text-black">
      <h1 className="text-2xl font-bold mb-4">Procurement Request Form</h1>


      {/* pr_form table */}
      <div className="grid grid-cols-2 gap-4 border-b pb-6">
        <input className="border p-2"
          placeholder="Entity Name"
          onChange={(e) => setFormData({...formData, entity_name: e.target.value})} />

        <input className="border p-2"
          placeholder="PR Number"
          onChange={(e) => setFormData({...formData, pr_num: e.target.value})} />

        <input className="border p-2"
          placeholder="Fund Cluster"
          onChange={(e) => setFormData({...formData, fund_cluster: e.target.value})} />

        <input className="border p-2"
          placeholder="Office Section"
          onChange={(e) => setFormData({...formData, office_section: e.target.value})} />
      </div>


      {/* pr_item table */}
      <div className="grid grid-cols-2 gap-4 border-b pb-6">
        <input className="border p-2"
          placeholder="Stock Number"
          onChange={(e) => setItemData({...itemData, stock_num: e.target.value})} />

        <input className="border p-2"
          placeholder="Unit"
          onChange={(e) => setItemData({...itemData, unit: e.target.value})} />

        <input className="border p-2"
          placeholder="Description"
          onChange={(e) => setItemData({...itemData, description: e.target.value})} />

        <input className="border p-2"
          placeholder="Quantity"
          onChange={(e) => setItemData({...itemData, quantity: e.target.value})} />

        <input className="border p-2"
          placeholder="Unit Cost"
          onChange={(e) => setItemData({...itemData, unit_cost: e.target.value})} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
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

}
