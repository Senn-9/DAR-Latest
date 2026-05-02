export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {

      aaa_documents: {
        Row: {
          id: number
          session_id: number | null
          aaa_no: string | null
          prepared_by: number | null
          prepared_at: string | null
          file_url: string | null
          particulars: string | null
        }
        Insert: {
          id?: number
          session_id?: number | null
          aaa_no?: string | null
          prepared_by?: number | null
          prepared_at?: string | null
          file_url?: string | null
          particulars?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["aaa_documents"]["Insert"]>
      }

      bac_resolution: {
        Row: {
          id: number
          session_id: number | null
          resolution_no: string | null
          prepared_by: number | null
          division_id: number | null
          pr_request_id: number | null
        }
        Insert: {
          id?: number
          session_id?: number | null
          resolution_no?: string | null
          prepared_by?: number | null
          division_id?: number | null
          pr_request_id?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["bac_resolution"]["Insert"]>
      }

      bac_resolution_prs: {
        Row: {
          id: number
          resolution_id: number
          pr_id: number | null
          pr_no: string
          pr_date: string | null
          estimated_cost: number | null
          end_user: string | null
          recommended_mode: string | null
        }
        Insert: {
          id?: number
          resolution_id: number
          pr_id?: number | null
          pr_no: string
          pr_date?: string | null
          estimated_cost?: number | null
          end_user?: string | null
          recommended_mode?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["bac_resolution_prs"]["Insert"]>
      }

      canvass_entries: {
        Row: {
          id: number
          session_id: number | null
          item_no: number | null
          description: string | null
          unit: string | null
          quantity: number | null
          supplier_name: string | null
          unit_price: number | null
          total_price: number | null
          is_winning: boolean | null
          created_at: string
          tin_no: string | null
          delivery_days: string | null
          assignment_id: number | null
          supplier_address: string | null
          quotation_no: number | null
        }
        Insert: {
          id?: number
          session_id?: number | null
          item_no?: number | null
          description?: string | null
          unit?: string | null
          quantity?: number | null
          supplier_name?: string | null
          unit_price?: number | null
          total_price?: number | null
          is_winning?: boolean | null
          created_at?: string
          tin_no?: string | null
          delivery_days?: string | null
          assignment_id?: number | null
          supplier_address?: string | null
          quotation_no?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["canvass_entries"]["Insert"]>
      }

      canvass_sessions: {
        Row: {
          id: number
          created_at: string
          updated_at: string | null
          pr_id: number | null
          stage: string | null
          released_by: number | null
          deadline: string | null
          status: string | null
          bac_no: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          updated_at?: string | null
          pr_id?: number | null
          stage?: string | null
          released_by?: number | null
          deadline?: string | null
          status?: string | null
          bac_no?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["canvass_sessions"]["Insert"]>
      }

      canvasser_assignments: {
        Row: {
          id: number
          session_id: number | null
          division_id: number | null
          canvasser_id: number | null
          released_at: string | null
          received_at: string | null
          returned_at: string | null
          status: string | null
          canvass_no: string | null
          rfq_index: number | null
        }
        Insert: {
          id?: number
          session_id?: number | null
          division_id?: number | null
          canvasser_id?: number | null
          released_at?: string | null
          received_at?: string | null
          returned_at?: string | null
          status?: string | null
          canvass_no?: string | null
          rfq_index?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["canvasser_assignments"]["Insert"]>
      }

      deliveries: {
        Row: {
          id: number
          po_id: number | null
          po_no: string
          supplier: string | null
          office_section: string | null
          division_id: number | null
          status_id: number
          delivery_no: string
          dr_no: string | null
          soa_no: string | null
          notes: string | null
          created_by: number | null
          created_at: string
          updated_at: string | null
          expected_delivery_date: string | null
        }
        Insert: {
          id?: number
          po_id?: number | null
          po_no: string
          supplier?: string | null
          office_section?: string | null
          division_id?: number | null
          status_id?: number
          delivery_no: string
          dr_no?: string | null
          soa_no?: string | null
          notes?: string | null
          created_by?: number | null
          created_at?: string
          updated_at?: string | null
          expected_delivery_date?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["deliveries"]["Insert"]>
      }

      division_budgets: {
        Row: {
          id: number
          division_id: number
          fiscal_year: number
          allocated: number | null
          utilized: number | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          division_id: number
          fiscal_year: number
          allocated?: number | null
          utilized?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["division_budgets"]["Insert"]>
      }

      divisions: {
        Row: {
          division_id: number
          division_name: string | null
        }
        Insert: {
          division_id?: number
          division_name?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["divisions"]["Insert"]>
      }

      dv_documents: {
        Row: {
          id: number
          delivery_id: number
          dv_no: string | null
          fund_cluster: string | null
          ors_no: string | null
          payee: string | null
          payee_tin: string | null
          address: string | null
          particulars: string | null
          responsibility_center: string | null
          mfo_pap: string | null
          amount_due: string | null
          mode_of_payment: string | null
          certified_by: string | null
          approved_by: string | null
          created_by: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          delivery_id: number
          dv_no?: string | null
          fund_cluster?: string | null
          ors_no?: string | null
          payee?: string | null
          payee_tin?: string | null
          address?: string | null
          particulars?: string | null
          responsibility_center?: string | null
          mfo_pap?: string | null
          amount_due?: string | null
          mode_of_payment?: string | null
          certified_by?: string | null
          approved_by?: string | null
          created_by?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["dv_documents"]["Insert"]>
      }

      remarks: {
        Row: {
          id: number
          remark: string | null
          created_at: string
          user_id: number | null
          pr_id: number | null
          status_flag_id: number | null
          prform_id: number | null
          po_id: number | null
          delivery_id: number | null
          phase: "pr" | "po" | "delivery" | "payment" | "system" | null
        }
        Insert: {
          id?: number
          remark?: string | null
          created_at?: string
          user_id?: number | null
          pr_id?: number | null
          status_flag_id?: number | null
          prform_id?: number | null
          po_id?: number | null
          delivery_id?: number | null
          phase?: "pr" | "po" | "delivery" | "payment" | "system" | null
        }
        Update: Partial<Database["public"]["Tables"]["remarks"]["Insert"]>
      }

      roles: {
        Row: {
          role_id: number
          role_name: string | null
        }
        Insert: {
          role_id?: number
          role_name?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>
      }

      status: {
        Row: {
          id: number
          status_name: string
        }
        Insert: {
          id?: number
          status_name: string
        }
        Update: Partial<Database["public"]["Tables"]["status"]["Insert"]>
      }

      status_flag: {
        Row: {
          id: number
          flag_name: string | null
        }
        Insert: {
          id?: number
          flag_name?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["status_flag"]["Insert"]>
      }

      users: {
        Row: {
          id: number
          created_at: string
          fullname: string | null
          password: string | null
          username: string | null
          division_id: number | null
          role_id: number | null
          last_login: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          fullname?: string | null
          password?: string | null
          username?: string | null
          division_id?: number | null
          role_id?: number | null
          last_login?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>
      }

    }
  }
}