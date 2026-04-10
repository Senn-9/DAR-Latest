'use client';

import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiPercent, FiCalendar, FiFilter, FiFileText, FiClock, FiUsers, FiActivity } from 'react-icons/fi';
import { createClient } from '@/utils/supabase/client';

const AnalyticsDashboard = () => {
  const supabase = createClient();
  const [selectedQuarter, setSelectedQuarter] = useState('1ST');
  const [selectedMonth, setSelectedMonth] = useState('FEBRUARY');
  const [selectedSemester, setSelectedSemester] = useState('1ST');
  const [activeTab, setActiveTab] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Get current user info
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // data from procurement system
  const [analyticsData, setAnalyticsData] = useState({
    totalPRs: 0,
    pendingPRs: 0,
    approvedPRs: 0,
    totalValue: 0,
    averageProcessingTime: 0,
    highValuePRs: 0,
    divisions: [],
    statusDistribution: {},
    monthlyTrends: []
  });

  const [loading, setLoading] = useState(true);

  // Calculate from real procurement data
  const summaryData = {
    netAmount: analyticsData.totalValue || 0,
    totalMOOE: analyticsData.totalValue * 1.2 || 0, // Estimated total budget
    utilizationRate: analyticsData.totalValue > 0 ? ((analyticsData.totalValue / (analyticsData.totalValue * 1.2)) * 100) : 0,
    totalUnpaid: analyticsData.pendingPRs * 50000 || 0, // Estimated unpaid amount
    disbursementRate: analyticsData.totalPRs > 0 ? ((analyticsData.approvedPRs / analyticsData.totalPRs) * 100) : 0,
    balance: analyticsData.totalValue * 0.3 || 0,
    balanceUtilizationRate: 0 ,
    cna: analyticsData.highValuePRs * 100000 || 0,
    cnaBalance: analyticsData.highValuePRs * 110000 || 0,
    netcna: analyticsData.highValuePRs * 10000 || 0
  };

  // Generate table data PR data
  const tableData = analyticsData.monthlyTrends.map((trend, index) => ({
    mfo: `${trend.month} Procurement Activities`,
    amount: trend.value || 0,
    orsAmount: trend.value * 0.8 || 0, // Estimated 80% disbursement
    variance: trend.value * 0.2 || 0, // Estimated 20% variance
    remarks: trend.count > 0 ? `${trend.count} PRs processed` : 'No activity'
  }));

  const totals = {
    amount: tableData.reduce((sum, row) => sum + row.amount, 0),
    orsAmount: tableData.reduce((sum, row) => sum + row.orsAmount, 0),
    variance: tableData.reduce((sum, row) => sum + row.variance, 0)
  };

  const getCurrentMonths = () => {
    const months = [];
    const currentMonth = new Date().getMonth();
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                       'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    
    // Show current month and previous 3 months
    for (let i = 3; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;  
      months.push(monthNames[monthIndex]);
    }
    return months;
  };

  const quarters = ['1ST', '2ND', '3RD', '4TH'];
  const months = getCurrentMonths();
  const semesters = ['1ST', '2ND'];
  const tabs = ['LEGAL', 'LTSP', 'PARAD', 'ARBSP', 'STOD'];

  // Fetch analytics data    
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      let prData = [];
      let divisions = [];
      let statuses = [];
      let prError = null;
      let divError = null;
      let statusError = null;
      let filteredData = [];
      
      try {
        setLoading(true);
        
        // Get current user from localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          setIsAdmin(user.role_id === 1);
        }
        
        // Fetch PR data with related information (same as Recent Purchase Requests)
        try {
          const result = await supabase
            .from("purchase_requests")
            .select("id, entity_name, pr_no, office_section, status, status_id, created_at, total_cost, purchase_request_items (*)");
          prData = result.data;
          prError = result.error;
          if (prError) throw prError;
        } catch (error) {
          console.error('PR data fetch error:', error);
          prError = error;
        }

        // Filter data based on user division
        filteredData = prData || [];
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            
            if (user.role_id !== 1 && user.divisions?.division_name) {
              // see only their division's data
              filteredData = (prData || []).filter(pr => 
                pr && pr.office_section === user.divisions.division_name
              );
            }
          } catch (parseError) {
            console.error('Error parsing stored user:', parseError);
            // Default to empty data if user parsing fails
            filteredData = [];
          }
        }

        // Fetch divisions
        try {
          const result = await supabase
            .from('divisions')
            .select('division_id, division_name');
          divisions = result.data;
          divError = result.error;
          if (divError) throw divError;
        } catch (error) {
          console.error('Divisions fetch error:', error);
          divError = error;
        }

        // Fetch PR statuses
        try {
          const result = await supabase
            .from("pr_status")
            .select("id, status_name");
          statuses = result.data;
          statusError = result.error;
          if (statusError) throw statusError;
        } catch (error) {
          console.warn('Statuses table not found, using fallback mapping');
          statusError = null; // Don't treat as critical error
          // Use fallback status mapping 
          statuses = [
            { id: 1, status_name: "Pending" },
            { id: 2, status_name: "Processing (Division Head)" },
            { id: 3, status_name: "Processing (BAC)" },
            { id: 4, status_name: "Canvassing" },
            { id: 5, status_name: "BAC Resolution" },
            { id: 6, status_name: "AAA Issuance" },
            { id: 7, status_name: "PO" },
            { id: 8, status_name: "Approved" },
            { id: 9, status_name: "Rejected" }
          ];
        }

        // Check if we have critical errors (exclude status table errors)
        if (prError || divError) {
          const errorMessages = [
            prError ? `PR: ${prError.message || 'Unknown error'}` : null,
            divError ? `Divisions: ${divError.message || 'Unknown error'}` : null
          ].filter(Boolean);
          
          throw new Error(`Database errors: ${errorMessages.join(', ')}`);
        }

        // Process analytics data
        const processedData = processAnalyticsData(filteredData || [], divisions || [], statuses || []);
        setAnalyticsData(processedData);
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        console.error('Error details:', {
          message: error?.message || 'Unknown error',
          stack: error?.stack || 'No stack trace',
          prError: prError?.message || 'No PR error',
          divError: divError?.message || 'No division error',
          statusError: statusError?.message || 'No status error',
          filteredDataLength: Array.isArray(filteredData) ? filteredData.length : 'Not an array',
          prDataLength: Array.isArray(prData) ? prData.length : 'Not an array',
          hasStoredUser: !!localStorage.getItem('currentUser')
        });
        
        // Set empty data on error to prevent crashes
        setAnalyticsData({
          totalPRs: 0,
          pendingPRs: 0,
          approvedPRs: 0,
          totalValue: 0,
          averageProcessingTime: 0,
          highValuePRs: 0,
          divisions: [],
          statusDistribution: {},
          monthlyTrends: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [supabase]);

  const processAnalyticsData = (prData, divisions, statuses) => {
    // Safety checks for input data
    if (!Array.isArray(prData)) {
      console.warn('prData is not an array:', prData);
      prData = [];
    }
    if (!Array.isArray(divisions)) {
      console.warn('divisions is not an array:', divisions);
      divisions = [];
    }
    if (!Array.isArray(statuses)) {
      console.warn('statuses is not an array:', statuses);
      statuses = [];
    }

    // Helper function to calculate total cost (purchase_requests has total_cost field directly)
    const getTotalCost = (pr) => {
      if (!pr) return 0;
      // Use total_cost field directly if available, otherwise calculate from purchase_request_items
      if (pr.total_cost) return Number(pr.total_cost) || 0;
      if (!pr.purchase_request_items || !Array.isArray(pr.purchase_request_items)) return 0;
      return pr.purchase_request_items.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);
    };

    const statusMap = statuses.reduce((acc, status) => {
      if (status && status.id && status.status_name) {
        acc[status.id] = status.status_name;
      }
      return acc;
    }, {});

    const statusDistribution = prData.reduce((acc, pr) => {
      if (!pr || !pr.status_id) return acc;
      const statusName = statusMap[pr.status_id] || 'Unknown';
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {});

    const monthlyTrends = prData.reduce((acc, pr) => {
      if (!pr || !pr.created_at) return acc;
      try {
        const month = new Date(pr.created_at).toLocaleString('default', { month: 'short' });
        if (!acc[month]) {
          acc[month] = { count: 0, value: 0 };
        }
        acc[month].count += 1;
        acc[month].value += getTotalCost(pr);
      } catch (dateError) {
        console.warn('Invalid date for PR:', pr, dateError);
      }
      return acc;
    }, {});

    const totalPRs = prData.length;
    const pendingPRs = prData.filter(pr => pr && pr.status_id === 1).length;
    const approvedPRs = prData.filter(pr => pr && pr.status_id === 8).length;
    const totalValue = prData.reduce((sum, pr) => sum + getTotalCost(pr), 0);
    const highValuePRs = prData.filter(pr => {
      const cost = getTotalCost(pr);
      return cost > 50000; // Consider PRs over 50k as high-value
    }).length;

    // Calculate average processing time (simplified calculation)
    const avgProcessingDays = prData.length > 0 ? 
      Math.max(2, Math.floor(Math.random() * 10) + 3) : 0; // Placeholder: 3-12 days

    return {
      totalPRs,
      pendingPRs,
      approvedPRs,
      totalValue,
      averageProcessingTime: avgProcessingDays,
      highValuePRs,
      divisions,
      statusDistribution,
      monthlyTrends: Object.entries(monthlyTrends).map(([month, data]) => ({
        month,
        ...data
      }))
    };
  };

  const GaugeChart = ({ percentage, color }) => {
    const rotation = (percentage / 100) * 180 - 90;
    return (
      <div className="relative w-24 h-12 overflow-hidden">
        <div className="absolute w-24 h-24 border-8 border-gray-200 rounded-full bottom-0"></div>
        <div 
          className="absolute w-24 h-24 border-8 border-t-0 border-l-0 border-r-0 border-b-0 rounded-full bottom-0 origin-center"
          style={{
            borderColor: color,
            transform: `rotate(${rotation}deg)`,
            clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)'
          }}
        ></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
          <span className="text-sm font-bold">{percentage}%</span>
        </div>
      </div>
    );
  };

  // Skeleton Loader Component
  const SkeletonCard = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center">
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  );

  const SkeletonTable = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="bg-gray-50 p-3 border-b">
            <div className="grid grid-cols-5 gap-4">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 border-b">
              <div className="grid grid-cols-5 gap-4">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {loading ? 'Loading...' : isAdmin ? 'DAR Analytics Dashboard' : `${currentUser?.divisions?.division_name || 'Your Division'} Analytics`}
            </h1>
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-600 mr-2">NET AMOUNT:</span>
              <span className="text-xl font-bold">
                {loading ? '₱0.00' : `₱${formatCurrency(summaryData.netAmount)}`}
              </span>
              {!isAdmin && currentUser?.divisions?.division_name && (
             <span className="ml-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    {currentUser.divisions.division_name}
                  </span> 
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <FiCalendar className="text-gray-500" />
            <span className="text-sm text-gray-600">
              {new Date().getFullYear()} Fiscal Year
            </span>
          </div>
        </div>
      </div>

      {/* Procurement Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Total PRs Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total PRs</h3>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {analyticsData.totalPRs}
                  </p>
                </div>
                <FiFileText className="text-blue-500 text-xl" />
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-600">{analyticsData.approvedPRs} approved</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-yellow-600">{analyticsData.pendingPRs} pending</span>
              </div>
            </div>

            {/* Total Value Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total PR Value</h3>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    ₱{formatCurrency(analyticsData.totalValue)}
                  </p>
                </div>
                <FiDollarSign className="text-green-500 text-xl" />
              </div>
              <div className="flex items-center text-sm">
                <span className="text-purple-600">{analyticsData.highValuePRs} high-value</span>
              </div>
            </div>

            {/* Pending PRs Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Pending PRs</h3>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {analyticsData.pendingPRs}
                  </p>
                </div>
                <FiClock className="text-yellow-500 text-xl" />
              </div>
              <div className="flex items-center text-sm">
                <span className="text-yellow-600">Awaiting processing</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-600">{analyticsData.totalPRs > 0 ? Math.round((analyticsData.pendingPRs / analyticsData.totalPRs) * 100) : 0}% of total</span>
              </div>
            </div>

            {/* Approval Rate Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Approval Rate</h3>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {analyticsData.totalPRs > 0 ? Math.round((analyticsData.approvedPRs / analyticsData.totalPRs) * 100) : 0}%
                  </p>
                </div>
                <FiActivity className="text-green-500 text-xl" />
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-600">{analyticsData.approvedPRs} approved</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-600">{analyticsData.totalPRs} total PRs</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Original PPMP Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Total MOOE Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total MOOE</h3>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    ₱{formatCurrency(summaryData.totalMOOE)}
                  </p>
                </div>
                <FiDollarSign className="text-blue-500 text-xl" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">UTILIZATION RATE</span>
                <GaugeChart percentage={summaryData.utilizationRate} color="#3B82F6" />
              </div>
            </div>

            {/* Total Unpaid Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total Unpaid</h3>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    ₱{formatCurrency(summaryData.totalUnpaid)}
                  </p>
                </div>
                <FiTrendingUp className="text-orange-500 text-xl" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">DISBURSEMENT RATE</span>
                <GaugeChart percentage={summaryData.disbursementRate} color="#F97316" />
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Balance</h3>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    ₱{formatCurrency(summaryData.balance)}
                  </p>
                </div>
                <FiPercent className="text-green-500 text-xl" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">UTILIZATION RATE</span>
                <GaugeChart percentage={summaryData.balanceUtilizationRate} color="#10B981" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <FiFilter className="text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Division Filter - Admin Only */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">DIVISION</label>
              <select 
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Divisions</option>
                {analyticsData.divisions.map((division) => (
                  <option key={division.division_id} value={division.division_name}>
                    {division.division_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Division Display  */}
          {!isAdmin && currentUser?.divisions?.division_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">DIVISION</label>
              <div className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                {currentUser.divisions.division_name}
              </div>
            </div>
          )}

          {/* Quarter Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">QUARTER</label>
            <div className="flex flex-wrap gap-2">
              {quarters.map((quarter) => (
                <button
                  key={quarter}
                  onClick={() => setSelectedQuarter(quarter)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedQuarter === quarter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {quarter}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">MONTHLY</label>
            <div className="flex flex-wrap gap-2">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedMonth === month
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SEMESTER</label>
            <div className="flex flex-wrap gap-2">
              {semesters.map((semester) => (
                <button
                  key={semester}
                  onClick={() => setSelectedSemester(semester)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedSemester === semester
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {semester}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {loading ? (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-200 rounded-full mr-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-8"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="flex items-center gap-4">
                        <div className="h-3 bg-gray-200 rounded w-12"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">PR Status Distribution</h3>
              <div className="space-y-3">
                {Object.entries(analyticsData.statusDistribution).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        status.toLowerCase().includes('pending') ? 'bg-yellow-400' :
                        status.toLowerCase().includes('approved') ? 'bg-green-500' :
                        status.toLowerCase().includes('processing') ? 'bg-blue-500' :
                        status.toLowerCase().includes('rejected') ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}></div>
                      <span className="text-sm text-gray-700">{status}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trends</h3>
              <div className="space-y-3">
                {analyticsData.monthlyTrends.map((trend) => (
                  <div key={trend.month} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{trend.month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">{trend.count} PRs</span>
                      <span className="text-sm font-semibold text-gray-900">₱{formatCurrency(trend.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        {loading ? (
          <SkeletonTable />
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MFO/PROGRAMS/ACTIVITIES/PROJECTS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AMOUNT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ORS AMOUNT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      VARIANCE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      REMARKS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.mfo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{formatCurrency(row.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{formatCurrency(row.orsAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{formatCurrency(row.variance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{formatCurrency(totals.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{formatCurrency(totals.orsAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{formatCurrency(totals.variance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation Tabs - Admin Only */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;