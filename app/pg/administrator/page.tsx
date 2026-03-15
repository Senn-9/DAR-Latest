/**
 * ════════════════════════════════════════════════════════════════════════════════
 * PR MODAL COMPONENT - COMPLETE ANNOTATED BREAKDOWN
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE: Create a Purchase Request (PR) Modal form with database integration,
 *          PDF export capability, and live preview functionality.
 * 
 * KEY FEATURES:
 *   - Form to capture Purchase Request details
 *   - Dynamic item row management (add/delete items)
 *   - Live preview of the official government form (Appendix 60)
 *   - PDF export functionality
 *   - Tab switching between form and preview
 *   - Data persistence with save functionality
 */

// ════════════════════════════════════════════════════════════════════════════════
// IMPORTS - Load required libraries and icons
// ════════════════════════════════════════════════════════════════════════════════

"use client"; // Mark as client component for Next.js

// React hooks for state management and lifecycle
import { useState, useEffect } from "react";

// Icon library for UI buttons
import {
  RiCloseLine,      // X icon for close button
  RiDeleteBinLine,  // Trash icon for delete button
  RiFilePdf2Line,   // PDF icon for export button
  RiSaveLine,       // Save icon for save button
  RiAddLine,        // Plus icon for add item button
} from "react-icons/ri";


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 1: TYPE DEFINITIONS
// Purpose: Define the shape of data structures used throughout the component
// ════════════════════════════════════════════════════════════════════════════════

/**
 * TYPE: PRItem
 * PURPOSE: Represents a single line item in the Purchase Request
 * USAGE: Each item contains details about what is being requested
 */
type PRItem = {
  // Unique identifier for this item (used for React keys and item management)
  id: string;
  
  // Stock or property number (e.g., "SN-12345")
  stockNo: string;
  
  // Unit of measurement (e.g., "pieces", "boxes", "kg")
  unit: string;
  
  // Detailed description of what is being requested
  description: string;
  
  // How many units are being requested
  quantity: string;
  
  // Cost per unit
  unitCost: string;
};

/**
 * TYPE: PRRecord
 * PURPOSE: Represents the complete Purchase Request document
 * USAGE: Contains all metadata and items for a single PR
 */
type PRRecord = {
  // Unique identifier for this PR record
  id: string;
  
  // ISO timestamp when the PR was last saved
  savedAt: string;
  
  // Name of the government entity/department making the request
  entityName: string;
  
  // Fund cluster identifier (typically "01", "02", etc.)
  fundCluster: string;
  
  // Office or section within the entity making the request
  office: string;
  
  // Unique PR number (e.g., "PR-2024-001")
  prNumber: string;
  
  // Date when the PR was created (YYYY-MM-DD format)
  date: string;
  
  // Responsibility Center Code for accounting purposes
  respCode: string;
  
  // Detailed statement of why these items are being requested
  purpose: string;
  
  // Array of all items being requested
  items: PRItem[];
  
  // Full name of the person requesting the items
  reqName: string;
  
  // Job title/designation of the requester
  reqDesig: string;
  
  // Full name of the person approving the request
  appName: string;
  
  // Job title/designation of the approver
  appDesig: string;
};


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 2: CONFIGURATION & CONSTANTS
// Purpose: Define reusable styling constants to maintain consistency
// ════════════════════════════════════════════════════════════════════════════════

/**
 * CONSTANT: tdStyle
 * PURPOSE: Table data cell styling for the official form
 * USAGE: Applied to all data cells in the PR preview table
 * WHY: Ensures consistent formatting that matches government form requirements
 */
const tdStyle: React.CSSProperties = {
  // Black border around each cell
  border: "1px solid black",
  
  // Font size matches official government form (8pt = very small)
  fontSize: "8pt",
  
  // Internal spacing within cells
  padding: "1px 3px",
  
  // Use Times New Roman to match official documents
  fontFamily: "'Times New Roman', Times, serif",
  
  // Black text color
  color: "#000",
  
  // Handle text that overflows the cell
  overflow: "hidden",
  
  // Wrap long text to multiple lines within the cell
  wordWrap: "break-word",
  
  // Allow whitespace to be preserved as typed
  whiteSpace: "normal",
};

/**
 * CONSTANT: thStyle
 * PURPOSE: Table header styling for column titles
 * USAGE: Applied to header row in the PR preview table
 * WHY: Makes headers visually distinct from data cells
 */
const thStyle: React.CSSProperties = {
  // Spread all properties from tdStyle (inherit base table styling)
  ...tdStyle,
  
  // Center align header text
  textAlign: "center",
  
  // Make header text bold for emphasis
  fontWeight: "bold",
};

/**
 * CONSTANT: inputCls
 * PURPOSE: Tailwind CSS classes for all input fields in the form
 * USAGE: Applied to every input, textarea, and select field
 * WHY: Ensures consistent styling across all form fields and visual feedback
 */
const inputCls = 
  // Full width of container
  "w-full " +
  // Horizontal padding inside input
  "px-3 " +
  // Vertical padding inside input
  "py-2 " +
  // Regular text size
  "text-sm " +
  // Dark text color
  "text-gray-900 " +
  // Gray border around input
  "border border-gray-200 " +
  // Rounded corners
  "rounded-lg " +
  // White background
  "bg-white " +
  // Remove browser default focus outline
  "focus:outline-none " +
  // Green ring when focused (accessibility + visual feedback)
  "focus:ring-2 focus:ring-emerald-500 " +
  // No border when focused (replaced by ring)
  "focus:border-transparent " +
  // Smooth transition between states
  "transition " +
  // Light gray placeholder text
  "placeholder:text-gray-300";


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 3: HELPER FUNCTIONS
// Purpose: Utility functions that support core functionality
// ════════════════════════════════════════════════════════════════════════════════

/**
 * FUNCTION: uid()
 * PURPOSE: Generate a unique identifier for items and records
 * RETURNS: String - A unique ID based on timestamp and random numbers
 * USAGE: Called when creating new items or records to ensure uniqueness
 * WHY: Prevents duplicate IDs when user adds multiple items quickly
 */
function uid(): string {
  // Convert current timestamp to base-36 (shorter representation)
  const timestamp = Date.now().toString(36);
  
  // Generate random number between 0-1
  const random = Math.random();
  
  // Convert to string and take characters starting from position 2 (skip "0.")
  const randomPart = random.toString(36).slice(2);
  
  // Combine both parts to create unique ID
  return timestamp + randomPart;
}

/**
 * FUNCTION: emptyItem()
 * PURPOSE: Create a blank PRItem for the user to fill in
 * RETURNS: PRItem - A new item with empty fields
 * USAGE: Called when user clicks "Add Item Row" button
 * WHY: Provides a template for users to add new line items to the PR
 */
function emptyItem(): PRItem {
  return {
    // Generate unique ID for this item
    id: uid(),
    
    // Empty stock number (user will fill in)
    stockNo: "",
    
    // Empty unit field (user will fill in)
    unit: "",
    
    // Empty description (user will fill in)
    description: "",
    
    // Empty quantity (user will fill in)
    quantity: "",
    
    // Empty unit cost (user will fill in)
    unitCost: ""
  };
}

/**
 * FUNCTION: emptyRecord()
 * PURPOSE: Create a blank PRRecord for a new Purchase Request
 * RETURNS: PRRecord - A new PR with default/empty values
 * USAGE: Called when opening the modal for creating a new PR
 * WHY: Provides initial state for the form when creating a new request
 */
function emptyRecord(): PRRecord {
  return {
    // Generate unique ID for this PR record
    id: uid(),
    
    // Set save time to current moment (ISO format)
    savedAt: new Date().toISOString(),
    
    // Empty entity name (user will fill in)
    entityName: "",
    
    // Empty fund cluster (user will fill in)
    fundCluster: "",
    
    // Empty office/section (user will fill in)
    office: "",
    
    // Empty PR number (user will fill in)
    prNumber: "",
    
    // Default to today's date (YYYY-MM-DD format)
    date: new Date().toISOString().slice(0, 10),
    
    // Empty responsibility code (user will fill in)
    respCode: "",
    
    // Empty purpose statement (user will fill in)
    purpose: "",
    
    // Start with one empty item row
    items: [emptyItem()],
    
    // Empty requester name (user will fill in)
    reqName: "",
    
    // Empty requester designation (user will fill in)
    reqDesig: "",
    
    // Empty approver name (user will fill in)
    appName: "",
    
    // Empty approver designation (user will fill in)
    appDesig: "",
  };
}

/**
 * FUNCTION: getItemTotal(item)
 * PURPOSE: Calculate the total cost for a single line item
 * PARAMETER: item - The PRItem to calculate total for
 * RETURNS: number - The calculated total (quantity × unit cost)
 * FORMULA: Total Cost = Quantity × Unit Cost
 * USAGE: Used to show total for each item and to calculate grand total
 * WHY: Automates the calculation so user doesn't have to manually compute
 */
function getItemTotal(item: PRItem): number {
  // Parse quantity as a number (0 if empty or invalid)
  const qty = parseFloat(item.quantity) || 0;
  
  // Parse unit cost as a number (0 if empty or invalid)
  const cost = parseFloat(item.unitCost) || 0;
  
  // Multiply quantity by unit cost to get total
  return qty * cost;
}

/**
 * FUNCTION: getGrandTotal(items)
 * PURPOSE: Calculate the sum of all line item totals
 * PARAMETER: items - Array of PRItem objects
 * RETURNS: number - The sum of all item totals
 * USAGE: Displayed at bottom of items section to show total PR amount
 * WHY: Gives user quick overview of total spending amount
 */
function getGrandTotal(items: PRItem[]): number {
  // Start with 0 as initial sum
  // For each item, call getItemTotal and add to running sum
  // Return final total
  return items.reduce((sum, item) => sum + getItemTotal(item), 0);
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 4: PRPreview COMPONENT
// Purpose: Display a live preview of the official government form
// Location: Right side of modal or "Preview" tab
// ════════════════════════════════════════════════════════════════════════════════

/**
 * COMPONENT: PRPreview
 * PURPOSE: Render a visual preview of the Purchase Request in official form format
 * PROPS: 
 *   - pr: PRRecord - The PR data to display
 * RETURNS: React.ReactElement - The rendered form
 * USAGE: Displayed in the preview tab/panel so user can see official appearance
 * WHY: Helps user verify data is correct before exporting to PDF
 */
function PRPreview({ pr }: { pr: PRRecord }): React.ReactElement {
  
  // Create a copy of the items array
  const itemRows = [...pr.items];
  
  // Government form always shows 30 rows (blank rows if fewer items)
  // Loop while rows < 30
  while (itemRows.length < 30) {
    // Add empty item to pad the list
    itemRows.push(emptyItem());
  }

  // Return the JSX for the preview
  return (
    // Container div with Times New Roman font (official document style)
    <div style={{ 
      fontFamily: "'Times New Roman', Times, serif", 
      fontSize: "9pt", 
      color: "#000" 
    }}>
      
      {/* Main table - represents the official form */}
      <table style={{ 
        width: "100%", 
        borderCollapse: "collapse", 
        color: "#000", 
        tableLayout: "fixed" 
      }}>
        
        {/* Define column widths */}
        <colgroup>
          <col style={{ width: "12%" }} />{/* Stock/Property No. */}
          <col style={{ width: "8%" }} />{/* Unit */}
          <col style={{ width: "40%" }} />{/* Item Description */}
          <col style={{ width: "10%" }} />{/* Quantity */}
          <col style={{ width: "15%" }} />{/* Unit Cost */}
          <col style={{ width: "15%" }} />{/* Total Cost */}
        </colgroup>
        
        <tbody>
          
          {/* ROW 1: "Appendix 60" identifier (right-aligned) */}
          <tr style={{ height: "27px" }}>
            <td colSpan={6} style={{ 
              textAlign: "right", 
              fontSize: "10pt", 
              paddingRight: "4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              Appendix 60
            </td>
          </tr>

          {/* ROW 2: Form title "PURCHASE REQUEST" (centered and bold) */}
          <tr style={{ height: "34px" }}>
            <td colSpan={6} style={{ 
              textAlign: "center", 
              fontWeight: "bold", 
              fontSize: "12pt", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              PURCHASE REQUEST
            </td>
          </tr>

          {/* ROW 3: Entity name and Fund cluster fields */}
          <tr style={{ height: "21px" }}>
            {/* Left side: Entity Name label and value */}
            <td colSpan={2} style={{ 
              borderBottom: "1px solid black", 
              fontSize: "8pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              fontWeight: "bold", 
              color: "#000" 
            }}>
              Entity Name: <span style={{ fontWeight: "normal" }}>{pr.entityName}</span>
            </td>
            
            {/* Middle: Empty cell for spacing */}
            <td style={{ borderBottom: "1px solid black" }}></td>
            
            {/* Right side: Fund Cluster label and value */}
            <td colSpan={3} style={{ 
              borderBottom: "1px solid black", 
              fontSize: "8pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              fontWeight: "bold", 
              color: "#000" 
            }}>
              Fund Cluster: <span style={{ fontWeight: "normal" }}>{pr.fundCluster}</span>
            </td>
          </tr>

          {/* ROWS 4-5: Office/Section, PR Number, and Date fields */}
          <tr style={{ height: "14px" }}>
            {/* Left side: Office/Section (spans 2 rows) */}
            <td rowSpan={2} colSpan={2} style={{ 
              border: "1px solid black", 
              fontSize: "8pt", 
              verticalAlign: "top", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              Office/Section :<br />{pr.office}
            </td>
            
            {/* Middle: PR Number field (top border only) */}
            <td colSpan={2} style={{ 
              borderTop: "1px solid black", 
              borderLeft: "1px solid black", 
              borderRight: "1px solid black", 
              fontSize: "8pt", 
              fontWeight: "bold", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              PR No.: <span style={{ fontWeight: "normal" }}>{pr.prNumber}</span>
            </td>
            
            {/* Right side: Date field (spans 2 rows) */}
            <td rowSpan={2} colSpan={2} style={{ 
              border: "1px solid black", 
              fontSize: "8pt", 
              fontWeight: "bold", 
              verticalAlign: "top", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              Date:<br /><span style={{ fontWeight: "normal" }}>{pr.date}</span>
            </td>
          </tr>

          {/* ROW 5: Responsibility Center Code field (continuation of above) */}
          <tr style={{ height: "15px" }}>
            {/* Responsibility Code field */}
            <td colSpan={2} style={{ 
              borderBottom: "1px solid black", 
              borderLeft: "1px solid black", 
              fontSize: "8pt", 
              fontWeight: "bold", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              Responsibility Center Code : <span style={{ fontWeight: "normal" }}>{pr.respCode}</span>
            </td>
          </tr>

          {/* ROW 6: Table header row with column titles */}
          <tr style={{ height: "22.5px" }}>
            {/* Stock/Property No. column header */}
            <th style={thStyle}>Stock/<br />Property No.</th>
            
            {/* Unit column header */}
            <th style={thStyle}>Unit</th>
            
            {/* Item Description column header */}
            <th style={thStyle}>Item Description</th>
            
            {/* Quantity column header */}
            <th style={thStyle}>Quantity</th>
            
            {/* Unit Cost column header */}
            <th style={thStyle}>Unit Cost</th>
            
            {/* Total Cost column header */}
            <th style={thStyle}>Total Cost</th>
          </tr>

          {/* ROWS 7-36: Line item rows (30 rows total) */}
          {itemRows.map((item, idx) => {
            // Calculate the total for this item
            const total = getItemTotal(item);
            
            return (
              // Render a row for each item
              <tr key={idx} style={{ height: "16px" }}>
                
                {/* Stock/Property No. cell */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {item.stockNo}
                </td>
                
                {/* Unit cell */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {item.unit}
                </td>
                
                {/* Item Description cell */}
                <td style={{ ...tdStyle, textAlign: "left", padding: "1px 4px" }}>
                  {item.description}
                </td>
                
                {/* Quantity cell */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {item.quantity}
                </td>
                
                {/* Unit Cost cell (formatted to 2 decimal places) */}
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {item.unitCost ? parseFloat(item.unitCost).toFixed(2) : ""}
                </td>
                
                {/* Total Cost cell (formatted to 2 decimal places, only show if > 0) */}
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {total > 0 ? total.toFixed(2) : ""}
                </td>
              </tr>
            );
          })}

          {/* ROW 37: Purpose statement row */}
          <tr style={{ height: "17px" }}>
            <td colSpan={6} style={{ 
              borderTop: "1px solid black", 
              borderLeft: "1px solid black", 
              borderRight: "1px solid black", 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              <b>Purpose:</b> {pr.purpose}
            </td>
          </tr>

          {/* ROW 38: Blank space row */}
          <tr style={{ height: "30px" }}>
            <td colSpan={6} style={{ 
              borderBottom: "1px solid black", 
              borderLeft: "1px solid black", 
              borderRight: "1px solid black" 
            }}></td>
          </tr>

          {/* ROWS 39-42: Signature section (requested by / approved by) */}
          
          {/* ROW 39: Section headers */}
          <tr style={{ height: "12px" }}>
            <td style={{ 
              borderTop: "1px solid black", 
              borderLeft: "1px solid black", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}></td>
            <td colSpan={2} style={{ 
              borderTop: "1px solid black", 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              <i>Requested by:</i>
            </td>
            <td colSpan={2} style={{ 
              borderTop: "1px solid black", 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              <i>Approved by:</i>
            </td>
            <td style={{ 
              borderTop: "1px solid black", 
              borderRight: "1px solid black" 
            }}></td>
          </tr>

          {/* ROW 40: Signature line label */}
          <tr style={{ height: "12px" }}>
            <td colSpan={2} style={{ 
              borderLeft: "1px solid black", 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              Signature :
            </td>
            <td></td><td></td><td></td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>

          {/* ROW 41: Printed names */}
          <tr style={{ height: "12px" }}>
            <td colSpan={2} style={{ 
              borderLeft: "1px solid black", 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              Printed Name :
            </td>
            <td style={{ 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              {pr.reqName}
            </td>
            <td colSpan={2} style={{ 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              {pr.appName}
            </td>
            <td style={{ borderRight: "1px solid black" }}></td>
          </tr>

          {/* ROW 42: Designations */}
          <tr style={{ height: "14.75px" }}>
            <td colSpan={2} style={{ 
              borderBottom: "1px solid black", 
              borderLeft: "1px solid black", 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              Designation :
            </td>
            <td style={{ 
              borderBottom: "1px solid black", 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              {pr.reqDesig}
            </td>
            <td colSpan={2} style={{ 
              borderBottom: "1px solid black", 
              fontSize: "8.5pt", 
              padding: "2px 4px", 
              fontFamily: "'Times New Roman', serif", 
              color: "#000" 
            }}>
              {pr.appDesig}
            </td>
            <td style={{ 
              borderBottom: "1px solid black", 
              borderRight: "1px solid black" 
            }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 5: PDF HTML BUILDER
// Purpose: Generate HTML string that can be printed/exported as PDF
// ════════════════════════════════════════════════════════════════════════════════

/**
 * FUNCTION: buildPRHtml(pr)
 * PURPOSE: Convert PRRecord data into HTML string formatted for PDF export
 * PARAMETER: pr - The PRRecord to convert to HTML
 * RETURNS: string - HTML markup of the form ready for PDF printing
 * USAGE: Called before downloading PDF to generate the HTML content
 * WHY: Separates form rendering logic from HTML generation for PDF
 */
function buildPRHtml(pr: PRRecord): string {
  
  // Create copy of items array
  const itemRows = [...pr.items];
  
  // Pad with empty rows to reach 30 rows (government form requirement)
  while (itemRows.length < 30) {
    itemRows.push(emptyItem());
  }

  // Reusable style string for table data cells
  const td = `border:1px solid black;font-size:8pt;padding:1px 3px;font-family:'Times New Roman',Times,serif;color:#000;`;

  // Generate all item rows as HTML strings
  const rows = itemRows.map((it) => {
    // Calculate total cost for this item (quantity × unit cost)
    const tot = getItemTotal(it);
    
    // Return a complete table row with all item fields
    return `<tr style="height:16px">
      <td style="${td}text-align:center">${it.stockNo}</td>
      <td style="${td}text-align:center">${it.unit}</td>
      <td style="${td}text-align:left;padding:1px 4px">${it.description}</td>
      <td style="${td}text-align:center">${it.quantity}</td>
      <td style="${td}text-align:right">${it.unitCost ? parseFloat(it.unitCost).toFixed(2) : ""}</td>
      <td style="${td}text-align:right">${tot > 0 ? tot.toFixed(2) : ""}</td>
    </tr>`;
  }).join("");

  // Return the complete HTML document as a single string
  return `
  <div style="font-family:'Times New Roman',Times,serif;font-size:9pt;color:#000">
    <table style="width:100%;border-collapse:collapse;color:#000;table-layout:fixed">
      <colgroup>
        <col style="width:12%"/><col style="width:8%"/><col style="width:40%"/><col style="width:10%"/><col style="width:15%"/><col style="width:15%"/>
      </colgroup>
      <tbody>
        <!-- Appendix 60 identifier -->
        <tr style="height:27px"><td colspan="6" style="text-align:right;font-size:10pt;padding-right:4px;font-family:'Times New Roman',serif;color:#000">Appendix 60</td></tr>
        
        <!-- Form title -->
        <tr style="height:34px"><td colspan="6" style="text-align:center;font-weight:bold;font-size:12pt;font-family:'Times New Roman',serif;color:#000">PURCHASE REQUEST</td></tr>
        
        <!-- Entity and fund cluster -->
        <tr style="height:21px">
          <td colspan="2" style="border-bottom:1px solid black;font-size:8pt;padding:2px 4px;font-family:'Times New Roman',serif;font-weight:bold;color:#000">
            Entity Name: <span style="font-weight:normal">${pr.entityName}</span></td>
          <td style="border-bottom:1px solid black"></td>
          <td colspan="3" style="border-bottom:1px solid black;font-size:8pt;padding:2px 4px;font-family:'Times New Roman',serif;font-weight:bold;color:#000">
            Fund Cluster: <span style="font-weight:normal">${pr.fundCluster}</span></td>
        </tr>
        
        <!-- Office, PR Number, Date -->
        <tr style="height:14px">
          <td rowspan="2" colspan="2" style="border:1px solid black;font-size:8pt;vertical-align:top;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            Office/Section :<br/>${pr.office}</td>
          <td colspan="2" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;font-size:8pt;font-weight:bold;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            PR No.: <span style="font-weight:normal">${pr.prNumber}</span></td>
          <td rowspan="2" colspan="2" style="border:1px solid black;font-size:8pt;font-weight:bold;vertical-align:top;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            Date:<br/><span style="font-weight:normal">${pr.date}</span></td>
        </tr>
        
        <!-- Responsibility code -->
        <tr style="height:15px">
          <td colspan="2" style="border-bottom:1px solid black;border-left:1px solid black;font-size:8pt;font-weight:bold;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            Responsibility Center Code : <span style="font-weight:normal">${pr.respCode}</span></td>
        </tr>
        
        <!-- Column headers -->
        <tr style="height:22.5px">
          <th style="${td}text-align:center">Stock/<br/>Property No.</th>
          <th style="${td}text-align:center">Unit</th>
          <th style="${td}text-align:center">Item Description</th>
          <th style="${td}text-align:center">Quantity</th>
          <th style="${td}text-align:center">Unit Cost</th>
          <th style="${td}text-align:center">Total Cost</th>
        </tr>
        
        <!-- All item rows inserted here -->
        ${rows}
        
        <!-- Purpose section -->
        <tr style="height:17px">
          <td colspan="6" style="border-top:1px solid black;border-left:1px solid black;border-right:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">
            <b>Purpose:</b> ${pr.purpose}</td>
        </tr>
        
        <!-- Blank space -->
        <tr style="height:30px"><td colspan="6" style="border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black"></td></tr>
        
        <!-- Signature section headers -->
        <tr style="height:12px">
          <td style="border-top:1px solid black;border-left:1px solid black;font-family:'Times New Roman',serif;color:#000"></td>
          <td colspan="2" style="border-top:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000"><i>Requested by:</i></td>
          <td colspan="2" style="border-top:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000"><i>Approved by:</i></td>
          <td style="border-top:1px solid black;border-right:1px solid black"></td>
        </tr>
        
        <!-- Signature lines -->
        <tr style="height:12px">
          <td colspan="2" style="border-left:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">Signature :</td>
          <td></td><td></td><td></td><td style="border-right:1px solid black"></td>
        </tr>
        
        <!-- Names -->
        <tr style="height:12px">
          <td colspan="2" style="border-left:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">Printed Name :</td>
          <td style="font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">${pr.reqName}</td>
          <td colspan="2" style="font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">${pr.appName}</td>
          <td style="border-right:1px solid black"></td>
        </tr>
        
        <!-- Designations -->
        <tr style="height:14.75px">
          <td colspan="2" style="border-bottom:1px solid black;border-left:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">Designation :</td>
          <td style="border-bottom:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">${pr.reqDesig}</td>
          <td colspan="2" style="border-bottom:1px solid black;font-size:8.5pt;padding:2px 4px;font-family:'Times New Roman',serif;color:#000">${pr.appDesig}</td>
          <td style="border-bottom:1px solid black;border-right:1px solid black"></td>
        </tr>
      </tbody>
    </table>
  </div>`;
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 6: PDF DOWNLOAD FUNCTIONALITY
// Purpose: Handle PDF export and print operations
// ════════════════════════════════════════════════════════════════════════════════

/**
 * FUNCTION: downloadPDF(pr)
 * PURPOSE: Generate PDF from PR data and trigger download/print
 * PARAMETER: pr - The PRRecord to export as PDF
 * RETURNS: void
 * USAGE: Called when user clicks "PDF" export button
 * WHY: Allows users to save PR as a file for printing or email
 */
function downloadPDF(pr: PRRecord) {
  
  // Generate HTML content using buildPRHtml function
  const html = buildPRHtml(pr);
  
  // Wrap HTML in complete document structure
  const full = `<!DOCTYPE html><html><head>
    <!-- Character encoding for proper text display -->
    <meta charset="UTF-8"/>
    <!-- Document title shows in browser and when printing -->
    <title>PR_${pr.prNumber}</title>
    <style>
      /* Reset browser defaults */
      *{box-sizing:border-box;margin:0;padding:0;}
      
      /* Body font and size -->
      body{font-family:'Times New Roman',Times,serif;font-size:9pt;color:#000;}
      
      /* Table styling -->
      table{width:100%;border-collapse:collapse;}
      
      /* Page setup for printing (A4 paper, 1.5cm margins) -->
      @page{size:A4;margin:1.5cm;}
      
      /* Print color settings (preserve colors in print) -->
      @media print{body{-webkit-print-color-adjust:exact;color-adjust:exact;}}
    </style>
  </head><body>
    <!-- Actual form content -->
    ${html}
    <!-- JavaScript to auto-print when page loads -->
    <script>
      window.onload=function(){
        setTimeout(function(){
          window.print();
        },300);
      }
    </script>
  </body></html>`;

  // Create a Blob (binary file) from the HTML string
  const blob = new Blob([full], { type: "text/html" });
  
  // Create a temporary URL pointing to the blob
  const url = URL.createObjectURL(blob);
  
  // Attempt to open in new window (preferred method)
  const win = window.open(url, "_blank");

  // Fallback if window.open is blocked
  if (!win) {
    // Create a temporary download link
    const a = document.createElement("a");
    // Set the download URL
    a.href = url;
    // Set the filename
    a.download = `PR_${pr.prNumber || "export"}.html`;
    // Add to DOM so it can be clicked
    document.body.appendChild(a);
    // Trigger the download
    a.click();
    // Clean up - remove the link
    document.body.removeChild(a);
  }

  // Clean up the temporary URL after 10 seconds
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 7: FIELD COMPONENT (REUSABLE)
// Purpose: Standardized form field with label
// ════════════════════════════════════════════════════════════════════════════════

/**
 * COMPONENT: Field
 * PURPOSE: Wrapper component for form fields with labels
 * PROPS:
 *   - label: string - The label text to display above the field
 *   - children: React.ReactNode - The input/textarea/select element
 * RETURNS: React.ReactElement - Labeled field wrapper
 * USAGE: Wraps every input field in the form for consistent styling
 * WHY: Reduces code repetition and ensures consistent field appearance
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // Container div with flex column layout
    <div className="flex flex-col gap-1">
      {/* Label element with styling */}
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      
      {/* The actual input/textarea element passed as children */}
      {children}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 8: MAIN PR MODAL COMPONENT
// Purpose: Main modal dialog for creating/editing Purchase Requests
// ════════════════════════════════════════════════════════════════════════════════

/**
 * COMPONENT: PRModal
 * PURPOSE: Main modal dialog for PR form with form and preview tabs
 * PROPS:
 *   - open: boolean - Whether the modal is currently visible
 *   - onClose: function - Callback when user closes modal
 *   - onSave: function - Callback when user saves PR (may be async)
 *   - editData?: PRRecord - If provided, loads this PR for editing
 * RETURNS: React.ReactElement | null - Modal JSX or null if not open
 * USAGE: Called by parent component to show PR creation/editing interface
 * WHY: Encapsulates entire PR form and preview functionality in one component
 */
function PRModal({ open, onClose, onSave, editData }: {
  // Is the modal visible?
  open: boolean;
  // Called when user clicks close
  onClose: () => void;
  // Called when user saves (may return Promise)
  onSave: (pr: PRRecord) => void | Promise<void>;
  // Data to load if editing existing PR
  editData?: PRRecord | null;
}) {
  
  // ══════════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════════
  
  // Store the PR record being edited (all form data)
  const [rec, setRec] = useState<PRRecord>(emptyRecord());
  
  // Track which tab is active: "form" or "preview"
  const [tab, setTab] = useState<"form" | "preview">("form");
  
  // Track whether currently saving to show loading state
  const [isSaving, setIsSaving] = useState(false);

  // ══════════════════════════════════════════════════════════════════════════════
  // EFFECT: Initialize form when modal opens
  // ══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Only run when modal opens
    if (open) {
      // If editing existing data, load it; otherwise start with empty form
      setRec(editData ? { ...editData } : emptyRecord());
      // Reset to form tab (not preview)
      setTab("form");
    }
  }, [open, editData]); // Re-run if open or editData changes

  // ══════════════════════════════════════════════════════════════════════════════
  // EFFECT: Lock/unlock page scrolling based on modal state
  // ══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // If modal is open, prevent background scrolling
    if (open) {
      document.body.style.overflow = "hidden";
    }
    
    // Cleanup: restore scrolling when modal closes
    return () => { 
      document.body.style.overflow = ""; 
    };
  }, [open]); // Re-run if open changes

  // ══════════════════════════════════════════════════════════════════════════════
  // FORM UPDATE FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════
  
  /**
   * FUNCTION: set(k, v)
   * PURPOSE: Update a top-level PR field
   * EXAMPLE: set("entityName", "Department of Education")
   */
  const set = (k: keyof PRRecord, v: any) => 
    // Take current record, spread its properties, update one field
    setRec(r => ({ ...r, [k]: v }));
  
  /**
   * FUNCTION: setItem(id, k, v)
   * PURPOSE: Update a specific field in a specific item
   * EXAMPLE: setItem("item-123", "description", "Office Supplies")
   */
  const setItem = (id: string, k: keyof PRItem, v: string) =>
    // Take current record, map through items
    setRec(r => ({ 
      ...r, 
      items: r.items.map(i => 
        // Update matching item, leave others unchanged
        i.id === id ? { ...i, [k]: v } : i
      ) 
    }));
  
  /**
   * FUNCTION: addItem()
   * PURPOSE: Add a new blank item row to the PR
   */
  const addItem = () => 
    setRec(r => ({ 
      ...r, 
      items: [...r.items, emptyItem()] // Add new empty item to array
    }));
  
  /**
   * FUNCTION: delItem(id)
   * PURPOSE: Delete an item from the PR (but keep at least 1 item)
   */
  const delItem = (id: string) =>
    setRec(r => ({ 
      ...r, 
      items: r.items.length > 1 
        // Only allow delete if more than 1 item exists
        ? r.items.filter(i => i.id !== id) 
        // Otherwise keep all items
        : r.items 
    }));

  // ══════════════════════════════════════════════════════════════════════════════
  // CALCULATE TOTALS
  // ══════════════════════════════════════════════════════════════════════════════
  
  // Calculate and cache the grand total of all items
  const grandTotal = getGrandTotal(rec.items);

  // ══════════════════════════════════════════════════════════════════════════════
  // SAVE HANDLER
  // ══════════════════════════════════════════════════════════════════════════════
  
  /**
   * FUNCTION: handleSave()
   * PURPOSE: Validate and save the PR
   * STEPS:
   *   1. Validate that PR number is provided
   *   2. Call onSave callback with PR data
   *   3. Close the modal on success
   *   4. Handle any errors gracefully
   */
  const handleSave = async () => {
    
    // VALIDATION: Check that PR number is filled in
    if (!rec.prNumber) {
      // Show error message to user
      alert("PR Number is required.");
      // Stop execution
      return;
    }

    // Show loading state
    setIsSaving(true);
    
    try {
      // Create a new record with current timestamp
      const saved: PRRecord = { 
        ...rec, 
        savedAt: new Date().toISOString() 
      };
      
      // Call parent's onSave callback with the data
      // This may be async (e.g., API call), so await it
      await onSave(saved);
      
      // If save successful, close the modal
      onClose();
    } catch (error) {
      // Log any errors that occur during save
      console.error("Error saving:", error);
      // Error message will be shown by parent component
    } finally {
      // Always stop loading state, whether success or error
      setIsSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // CONDITIONAL RENDERING: Don't render if modal is closed
  // ══════════════════════════════════════════════════════════════════════════════
  if (!open) return null;

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: Modal JSX
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    // Outer container - full screen fixed overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* Semi-transparent dark backdrop behind modal */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Main modal container */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* ══════════════════════════════════════════════════════════════════════════════
            MODAL HEADER
            ══════════════════════════════════════════════════════════════════════════════ */}
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          
          {/* Left side: Title and subtitle */}
          <div>
            {/* Main heading */}
            <h2 className="text-white font-bold text-base tracking-wide">
              New Purchase Request
            </h2>
            {/* Subtitle describing the form type */}
            <p className="text-emerald-200 text-xs mt-0.5">
              Appendix 60 · Official Government Form
            </p>
          </div>

          {/* Right side: Tab buttons and close button */}
          <div className="flex items-center gap-2">
            
            {/* Tab switch buttons */}
            <div className="flex rounded-lg overflow-hidden border border-emerald-500 mr-2">
              
              {/* Form tab button */}
              <button 
                onClick={() => setTab("form")}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                  tab === "form" 
                    ? "bg-white text-emerald-700" 
                    : "text-emerald-200 hover:text-white"
                }`}
              >
                Form
              </button>
              
              {/* Preview tab button */}
              <button 
                onClick={() => setTab("preview")}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                  tab === "preview" 
                    ? "bg-white text-emerald-700" 
                    : "text-emerald-200 hover:text-white"
                }`}
              >
                Preview
              </button>
            </div>

            {/* Close button (X icon) */}
            <button 
              onClick={onClose} 
              className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <RiCloseLine size={20} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════════
            MODAL BODY - Two sections: Form (left) and Preview (right)
            ══════════════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-1 overflow-hidden">

          {/* ══════════════════════════════════════════════════════════════════════════════
              LEFT PANEL: FORM
              ══════════════════════════════════════════════════════════════════════════════ */}
          <div className={`flex flex-col overflow-hidden ${tab === "form" ? "flex-1" : "hidden"} md:flex md:w-[420px] md:flex-none md:border-r border-gray-100`}>

            {/* Scrollable form content area */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ════════════════════════════════════════════════════════════════════════════════
                  SECTION 1: HEADER INFORMATION
                  Contains: Entity Name, Fund Cluster, PR Number, Office, Date, etc.
                  ════════════════════════════════════════════════════════════════════════════════ */}
              <section>
                {/* Section title */}
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                  Header Information
                </h3>
                
                <div className="space-y-3">
                  
                  {/* Field: Entity Name */}
                  <Field label="Entity Name">
                    <input 
                      className={inputCls} 
                      value={rec.entityName} 
                      onChange={e => set("entityName", e.target.value)} 
                      placeholder="e.g. Department of Education" 
                    />
                  </Field>

                  {/* Two columns for next fields */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Field: Fund Cluster */}
                    <Field label="Fund Cluster">
                      <input 
                        className={inputCls} 
                        value={rec.fundCluster} 
                        onChange={e => set("fundCluster", e.target.value)} 
                        placeholder="e.g. 01" 
                      />
                    </Field>

                    {/* Field: PR Number (Required) */}
                    <Field label="PR Number *">
                      <input 
                        className={inputCls} 
                        value={rec.prNumber} 
                        onChange={e => set("prNumber", e.target.value)} 
                        placeholder="PR-2024-001" 
                      />
                    </Field>

                    {/* Field: Office / Section */}
                    <Field label="Office / Section">
                      <input 
                        className={inputCls} 
                        value={rec.office} 
                        onChange={e => set("office", e.target.value)} 
                        placeholder="Procurement" 
                      />
                    </Field>

                    {/* Field: Date (Required) */}
                    <Field label="Date *">
                      <input 
                        className={inputCls} 
                        type="date" 
                        value={rec.date} 
                        onChange={e => set("date", e.target.value)} 
                      />
                    </Field>
                  </div>

                  {/* Field: Responsibility Center Code */}
                  <Field label="Responsibility Center Code">
                    <input 
                      className={inputCls} 
                      value={rec.respCode} 
                      onChange={e => set("respCode", e.target.value)} 
                      placeholder="e.g. 10001" 
                    />
                  </Field>
                </div>
              </section>

              {/* ════════════════════════════════════════════════════════════════════════════════
                  SECTION 2: ITEMS
                  Dynamic item rows that user can add/delete
                  ════════════════════════════════════════════════════════════════════════════════ */}
              <section>
                {/* Section title */}
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                  Items
                </h3>
                
                <div className="space-y-3">
                  
                  {/* Loop through each item and render an item card */}
                  {rec.items.map((item, idx) => (
                    <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      
                      {/* Item header with item number and delete button */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                          Item {idx + 1}
                        </span>
                        <button 
                          onClick={() => delItem(item.id)} 
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <RiDeleteBinLine size={14} />
                        </button>
                      </div>

                      {/* Item Description */}
                      <Field label="Item Description">
                        <input 
                          className={inputCls} 
                          value={item.description} 
                          onChange={e => setItem(item.id, "description", e.target.value)} 
                          placeholder="Describe the item" 
                        />
                      </Field>

                      {/* Three columns: Stock No, Unit, Quantity */}
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        
                        {/* Field: Stock/Property Number */}
                        <Field label="Stock/Prop No.">
                          <input 
                            className={inputCls} 
                            value={item.stockNo} 
                            onChange={e => setItem(item.id, "stockNo", e.target.value)} 
                            placeholder="—" 
                          />
                        </Field>
                        
                        {/* Field: Unit of Measurement */}
                        <Field label="Unit">
                          <input 
                            className={inputCls} 
                            value={item.unit} 
                            onChange={e => setItem(item.id, "unit", e.target.value)} 
                            placeholder="pcs" 
                          />
                        </Field>
                        
                        {/* Field: Quantity */}
                        <Field label="Qty">
                          <input 
                            className={inputCls} 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => setItem(item.id, "quantity", e.target.value)} 
                            placeholder="0" 
                          />
                        </Field>
                      </div>

                      {/* Two columns: Unit Cost and Total Cost */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        
                        {/* Field: Unit Cost */}
                        <Field label="Unit Cost">
                          <input 
                            className={inputCls} 
                            type="number" 
                            value={item.unitCost} 
                            onChange={e => setItem(item.id, "unitCost", e.target.value)} 
                            placeholder="0.00" 
                          />
                        </Field>
                        
                        {/* Field: Total Cost (Read-only, auto-calculated) */}
                        <Field label="Total Cost">
                          <input 
                            className={inputCls} 
                            value={getItemTotal(item).toFixed(2)} 
                            readOnly 
                            style={{ background: "#f0fdf4", color: "#15803d", fontWeight: 600 }} 
                          />
                        </Field>
                      </div>
                    </div>
                  ))}

                  {/* Button: Add Item Row */}
                  <button 
                    onClick={addItem} 
                    className="w-full py-2.5 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 text-sm font-medium hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                  >
                    + Add Item Row
                  </button>

                  {/* Grand Total Display */}
                  <div className="flex justify-between items-center px-3 py-2 bg-emerald-700 rounded-lg">
                    <span className="text-emerald-100 text-xs font-bold uppercase tracking-wide">
                      Grand Total
                    </span>
                    <span className="text-white font-bold text-sm">
                      ₱{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </section>

              {/* ════════════════════════════════════════════════════════════════════════════════
                  SECTION 3: SIGNATURES
                  Names and designations of requester and approver
                  ════════════════════════════════════════════════════════════════════════════════ */}
              <section>
                {/* Section title */}
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                  Signatures
                </h3>
                
                {/* Two columns: Requested By / Approved By */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Left column: Requested By */}
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-2">
                      Requested By
                    </p>
                    <div className="space-y-2">
                      {/* Requester name */}
                      <Field label="Printed Name">
                        <input 
                          className={inputCls} 
                          value={rec.reqName} 
                          onChange={e => set("reqName", e.target.value)} 
                          placeholder="Full name" 
                        />
                      </Field>
                      {/* Requester title */}
                      <Field label="Designation">
                        <input 
                          className={inputCls} 
                          value={rec.reqDesig} 
                          onChange={e => set("reqDesig", e.target.value)} 
                          placeholder="Position/Title" 
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Right column: Approved By */}
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-2">
                      Approved By
                    </p>
                    <div className="space-y-2">
                      {/* Approver name */}
                      <Field label="Printed Name">
                        <input 
                          className={inputCls} 
                          value={rec.appName} 
                          onChange={e => set("appName", e.target.value)} 
                          placeholder="Full name" 
                        />
                      </Field>
                      {/* Approver title */}
                      <Field label="Designation">
                        <input 
                          className={inputCls} 
                          value={rec.appDesig} 
                          onChange={e => set("appDesig", e.target.value)} 
                          placeholder="Position/Title" 
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </section>

              {/* ════════════════════════════════════════════════════════════════════════════════
                  SECTION 4: PURPOSE
                  Detailed explanation of why the items are needed
                  ════════════════════════════════════════════════════════════════════════════════ */}
              <section>
                {/* Section title */}
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">
                  Purpose
                </h3>
                
                {/* Purpose textarea (3 rows) */}
                <Field label="Purpose">
                  <textarea 
                    className={inputCls} 
                    rows={3} 
                    value={rec.purpose} 
                    onChange={e => set("purpose", e.target.value)} 
                    placeholder="State the purpose..." 
                  />
                </Field>
              </section>

            </div>

            {/* ════════════════════════════════════════════════════════════════════════════════
                FOOTER: Action buttons (Save and PDF)
                ════════════════════════════════════════════════════════════════════════════════ */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 flex-shrink-0">
              
              {/* Save button */}
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <RiSaveLine size={15} /> 
                {isSaving ? "Saving..." : "Save"}
              </button>

              {/* PDF Export button */}
              <button 
                onClick={() => {
                  // Validate PR number before allowing PDF export
                  if (!rec.prNumber) {
                    alert("PR Number is required.");
                    return;
                  }
                  // Generate and download PDF
                  downloadPDF(rec);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <RiFilePdf2Line size={15} /> PDF
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════════
              RIGHT PANEL: PREVIEW
              Live preview of how the form will look when printed
              ══════════════════════════════════════════════════════════════════════════════ */}
          <div className={`flex-1 overflow-y-auto bg-gray-100 p-6 ${tab === "preview" ? "block" : "hidden"} md:block`}>
            
            {/* Preview header with PDF button */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Live Preview
              </span>
              {/* PDF export button in preview */}
              <button 
                onClick={() => downloadPDF(rec)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <RiFilePdf2Line size={13} /> PDF
              </button>
            </div>

            {/* Preview content: The official form layout */}
            <div className="bg-white shadow-lg rounded-lg p-6 overflow-x-auto text-black">
              {/* Render the PRPreview component with current PR data */}
              <PRPreview pr={rec} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════════
// SECTION 9: MAIN EXPORT COMPONENT
// Purpose: The component exported to parent pages/components
// ════════════════════════════════════════════════════════════════════════════════

/**
 * COMPONENT: PRModalComponent (Default Export)
 * PURPOSE: Main entry point - provides button to open PR modal and manages modal state
 * PROPS:
 *   - onSave?: function - Optional callback when user saves a PR
 * RETURNS: React.ReactElement - Button and modal component
 * USAGE: Import and use this component in parent page/layout
 * EXAMPLE:
 *   <PRModalComponent onSave={async (pr) => {
 *     await api.post('/purchase-requests', pr);
 *   }} />
 */
export default function PRModalComponent({ onSave }: { onSave?: (pr: PRRecord) => void | Promise<void> }) {
  
  // Track whether the modal is currently open
  const [modalOpen, setModalOpen] = useState(false);

  /**
   * FUNCTION: handleCreate()
   * PURPOSE: Open the modal when "Create" button is clicked
   */
  const handleCreate = () => {
    setModalOpen(true);
  };

  /**
   * FUNCTION: handleSavePR(pr)
   * PURPOSE: Pass the PR data to parent component's onSave callback
   * PARAMETER: pr - The PRRecord being saved
   */
  const handleSavePR = async (pr: PRRecord) => {
    // If parent provided onSave callback, call it
    if (onSave) {
      await onSave(pr);
    }
  };

  return (
    <>
      {/* The modal component (hidden when modalOpen is false) */}
      <PRModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePR}
        editData={null} // TODO: Could support edit mode by passing existing PR here
      />

      {/* Create button - opens the modal when clicked */}
      <button 
        onClick={handleCreate}
        className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors duration-200 justify-center"
      >
        <RiAddLine size={18} /> Create
      </button>
    </>
  );
} //dae ko na na aayos 😭😭😭