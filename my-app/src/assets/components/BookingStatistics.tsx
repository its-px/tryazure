import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { supabase } from "../components/supabaseClient";

interface Booking {
  id: string;
  date: string;
  user_id: string;
  professional_id: string;
  location: string;
  services: string;
  status: string;
  created_at: string;
}

interface BookingStatisticsProps {
  allBookings: Booking[];
  professionalNameMap?: Record<string, string>;
}

interface DailyBooking {
  date: string;
  count: number;
  displayDate: string;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface ProfessionalData {
  name: string;
  bookings: number;
  revenue: number;
  professionalId: string;
}

interface ProjectedIncomeData {
  date: string;
  displayDate: string;
  revenue: number;
  bookings: number;
}

interface MonthlyPerformance {
  month: string;
  displayMonth: string;
  bookings: number;
  revenue: number;
}

interface ServiceCancellationData {
  serviceId: string;
  serviceName: string;
  totalBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
}

export default function BookingStatistics({
  allBookings,
  professionalNameMap = {},
}: BookingStatisticsProps) {
  const colors = useResolvedColors();

  const [dailyBookings, setDailyBookings] = useState<DailyBooking[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [professionalData, setProfessionalData] = useState<ProfessionalData[]>(
    [],
  );
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
  });
  const [serviceMap, setServiceMap] = useState<
    Record<string, { name: string; price: number }>
  >({});
  const [projectedIncome, setProjectedIncome] = useState<ProjectedIncomeData[]>(
    [],
  );
  const [revenueStats, setRevenueStats] = useState({
    past30Days: 0,
    projected30Days: 0,
    averagePerBooking: 0,
  });
  const [monthlyPerformance, setMonthlyPerformance] = useState<
    MonthlyPerformance[]
  >([]);
  const [bestMonths, setBestMonths] = useState<{
    byBookings: MonthlyPerformance | null;
    byRevenue: MonthlyPerformance | null;
  }>({
    byBookings: null,
    byRevenue: null,
  });
  const [cancellationRate, setCancellationRate] = useState<number>(0);
  const [serviceCancellations, setServiceCancellations] = useState<
    ServiceCancellationData[]
  >([]);

  const resolveProfessionalName = useCallback(
    (profId: string) =>
      professionalNameMap[profId] ??
      (profId === "prof1"
        ? "Person 1"
        : profId === "prof2"
          ? "Person 2"
          : profId),
    [professionalNameMap],
  );
  const [professionalPerformance, setProfessionalPerformance] = useState<
    ProfessionalData[]
  >([]);
  const [topProfessionals, setTopProfessionals] = useState<{
    byBookings: ProfessionalData | null;
    byRevenue: ProfessionalData | null;
  }>({
    byBookings: null,
    byRevenue: null,
  });

  const loadServicePrices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price");

      if (error) {
        console.error("Error loading service prices:", error);
        return;
      }

      const map: Record<string, { name: string; price: number }> = {};
      data?.forEach((service) => {
        map[service.id] = {
          name: service.name,
          price: parseFloat(service.price) || 0,
        };
      });
      setServiceMap(map);
    } catch (err) {
      console.error("Exception loading service prices:", err);
    }
  }, []);

  const calculateStatistics = useCallback(() => {
    const today = dayjs();
    const thirtyDaysAgo = today.subtract(30, "day");

    // Filter bookings from last 30 days
    const recentBookings = allBookings.filter((booking) => {
      const bookingDate = dayjs(booking.date);
      return (
        bookingDate.isAfter(thirtyDaysAgo) &&
        bookingDate.isBefore(today.add(1, "day"))
      );
    });

    // Calculate daily bookings
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const date = thirtyDaysAgo.add(i, "day").format("YYYY-MM-DD");
      dailyMap[date] = 0;
    }

    recentBookings.forEach((booking) => {
      const dateKey = dayjs(booking.date).format("YYYY-MM-DD");
      if (dailyMap[dateKey] !== undefined) {
        dailyMap[dateKey]++;
      }
    });

    const dailyData: DailyBooking[] = Object.entries(dailyMap).map(
      ([date, count]) => ({
        date,
        count,
        displayDate: dayjs(date).format("MMM DD"),
      }),
    );

    setDailyBookings(dailyData);

    // Calculate status statistics
    const statusCount = {
      confirmed: recentBookings.filter((b) => b.status === "confirmed").length,
      pending: recentBookings.filter((b) => b.status === "pending").length,
      cancelled: recentBookings.filter((b) => b.status === "cancelled").length,
    };

    setStats({
      total: recentBookings.length,
      confirmed: statusCount.confirmed,
      pending: statusCount.pending,
      cancelled: statusCount.cancelled,
    });

    const statusChartData: StatusData[] = [
      {
        name: "Confirmed",
        value: statusCount.confirmed,
        color: colors.status.confirmed,
      },
      {
        name: "Pending",
        value: statusCount.pending,
        color: colors.accent.main,
      },
      {
        name: "Cancelled",
        value: statusCount.cancelled,
        color: colors.error.main,
      },
    ].filter((item) => item.value > 0);

    setStatusData(statusChartData);

    // Calculate bookings by professional (last 30 days)
    const professionalCount: Record<
      string,
      { bookings: number; revenue: number }
    > = {};
    recentBookings.forEach((booking) => {
      const profId = booking.professional_id;
      if (!professionalCount[profId]) {
        professionalCount[profId] = { bookings: 0, revenue: 0 };
      }
      professionalCount[profId].bookings++;

      // Calculate revenue for this booking
      if (booking.status === "confirmed" || booking.status === "pending") {
        try {
          const serviceIds = JSON.parse(booking.services);
          let bookingRevenue = 0;

          serviceIds.forEach((serviceId: string) => {
            const service = serviceMap[serviceId];
            if (service) {
              bookingRevenue += service.price;
            }
          });

          professionalCount[profId].revenue += bookingRevenue;
        } catch (err) {
          console.error("Error parsing booking services:", err);
        }
      }
    });

    const profData: ProfessionalData[] = Object.entries(professionalCount).map(
      ([profId, stats]) => ({
        professionalId: profId,
        name: resolveProfessionalName(profId),
        bookings: stats.bookings,
        revenue: Math.round(stats.revenue * 100) / 100,
      }),
    );

    setProfessionalData(profData);

    // Calculate revenue from past 30 days
    let totalRevenue = 0;
    const dailyRevenue: Record<string, number> = {};

    recentBookings.forEach((booking) => {
      if (booking.status === "confirmed" || booking.status === "pending") {
        try {
          const serviceIds = JSON.parse(booking.services);
          let bookingRevenue = 0;

          serviceIds.forEach((serviceId: string) => {
            const service = serviceMap[serviceId];
            if (service) {
              bookingRevenue += service.price;
            }
          });

          totalRevenue += bookingRevenue;

          const dateKey = dayjs(booking.date).format("YYYY-MM-DD");
          dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + bookingRevenue;
        } catch (err) {
          console.error("Error parsing booking services:", err);
        }
      }
    });

    // Calculate average revenue per booking
    const confirmedCount = recentBookings.filter(
      (b) => b.status === "confirmed" || b.status === "pending",
    ).length;
    const avgRevenue = confirmedCount > 0 ? totalRevenue / confirmedCount : 0;

    // Project future income based on trends
    const projectedData = [];

    // Calculate daily average bookings from past 30 days
    const avgDailyBookings = recentBookings.length / 30;

    // Calculate trend: compare first half vs second half of the period
    const firstHalfBookings = recentBookings.filter((b) => {
      const bookingDate = dayjs(b.date);
      return bookingDate.isBefore(thirtyDaysAgo.add(15, "day"));
    }).length;

    const secondHalfBookings = recentBookings.length - firstHalfBookings;
    const trendMultiplier =
      firstHalfBookings > 0 ? secondHalfBookings / firstHalfBookings : 1;

    // Generate projected income for next 30 days
    let projectedTotal = 0;
    for (let i = 1; i <= 30; i++) {
      const futureDate = today.add(i, "day");
      const dateStr = futureDate.format("YYYY-MM-DD");

      // Apply trend multiplier and some randomness for realistic projection
      const baseBookings = avgDailyBookings * trendMultiplier;
      const randomFactor = 0.8 + Math.random() * 0.4; // 80% to 120%
      const projectedBookings = Math.round(baseBookings * randomFactor);

      const projectedRevenue = projectedBookings * avgRevenue;
      projectedTotal += projectedRevenue;

      projectedData.push({
        date: dateStr,
        displayDate: futureDate.format("MMM DD"),
        revenue: Math.round(projectedRevenue * 100) / 100,
        bookings: projectedBookings,
      });
    }

    setProjectedIncome(projectedData);
    setRevenueStats({
      past30Days: Math.round(totalRevenue * 100) / 100,
      projected30Days: Math.round(projectedTotal * 100) / 100,
      averagePerBooking: Math.round(avgRevenue * 100) / 100,
    });

    // Calculate monthly performance (all-time)
    const monthlyData: Record<string, { bookings: number; revenue: number }> =
      {};

    allBookings.forEach((booking) => {
      const monthKey = dayjs(booking.date).format("YYYY-MM");

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { bookings: 0, revenue: 0 };
      }

      monthlyData[monthKey].bookings++;

      // Calculate revenue for this booking if confirmed or pending
      if (booking.status === "confirmed" || booking.status === "pending") {
        try {
          const serviceIds = JSON.parse(booking.services);
          let bookingRevenue = 0;

          serviceIds.forEach((serviceId: string) => {
            const service = serviceMap[serviceId];
            if (service) {
              bookingRevenue += service.price;
            }
          });

          monthlyData[monthKey].revenue += bookingRevenue;
        } catch (err) {
          console.error("Error parsing booking services:", err);
        }
      }
    });

    // Convert to array and sort by month
    const monthlyArray: MonthlyPerformance[] = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        displayMonth: dayjs(month).format("MMM YYYY"),
        bookings: data.bookings,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setMonthlyPerformance(monthlyArray);

    // Find best performing months
    if (monthlyArray.length > 0) {
      const bestByBookings = monthlyArray.reduce((max, current) =>
        current.bookings > max.bookings ? current : max,
      );

      const bestByRevenue = monthlyArray.reduce((max, current) =>
        current.revenue > max.revenue ? current : max,
      );

      setBestMonths({
        byBookings: bestByBookings,
        byRevenue: bestByRevenue,
      });
    }

    // Calculate overall cancellation rate
    const totalAllBookings = allBookings.length;
    const cancelledAllBookings = allBookings.filter(
      (b) => b.status === "cancelled",
    ).length;
    const overallCancellationRate =
      totalAllBookings > 0
        ? Math.round((cancelledAllBookings / totalAllBookings) * 10000) / 100
        : 0;

    setCancellationRate(overallCancellationRate);

    // Calculate cancellation rate per service
    const serviceStats: Record<string, { total: number; cancelled: number }> =
      {};

    allBookings.forEach((booking) => {
      try {
        const serviceIds = JSON.parse(booking.services);
        serviceIds.forEach((serviceId: string) => {
          if (!serviceStats[serviceId]) {
            serviceStats[serviceId] = { total: 0, cancelled: 0 };
          }
          serviceStats[serviceId].total++;
          if (booking.status === "cancelled") {
            serviceStats[serviceId].cancelled++;
          }
        });
      } catch (err) {
        console.error("Error parsing booking services:", err);
      }
    });

    // Convert to array and calculate rates
    const serviceCancellationArray: ServiceCancellationData[] = Object.entries(
      serviceStats,
    )
      .map(([serviceId, stats]) => ({
        serviceId,
        serviceName: serviceMap[serviceId]?.name || serviceId,
        totalBookings: stats.total,
        cancelledBookings: stats.cancelled,
        cancellationRate:
          stats.total > 0
            ? Math.round((stats.cancelled / stats.total) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.cancellationRate - a.cancellationRate); // Sort by highest cancellation rate

    setServiceCancellations(serviceCancellationArray);

    // Calculate professional performance (all-time bookings and revenue)
    const professionalStats: Record<
      string,
      { bookings: number; revenue: number }
    > = {};

    allBookings.forEach((booking) => {
      const profId = booking.professional_id;

      if (!professionalStats[profId]) {
        professionalStats[profId] = { bookings: 0, revenue: 0 };
      }

      professionalStats[profId].bookings++;

      // Calculate revenue for confirmed and pending bookings
      if (booking.status === "confirmed" || booking.status === "pending") {
        try {
          const serviceIds = JSON.parse(booking.services);
          let bookingRevenue = 0;

          serviceIds.forEach((serviceId: string) => {
            const service = serviceMap[serviceId];
            if (service) {
              bookingRevenue += service.price;
            }
          });

          professionalStats[profId].revenue += bookingRevenue;
        } catch (err) {
          console.error("Error parsing booking services:", err);
        }
      }
    });

    // Convert to array
    const professionalPerformanceArray: ProfessionalData[] = Object.entries(
      professionalStats,
    ).map(([profId, stats]) => ({
      professionalId: profId,
      name: resolveProfessionalName(profId),
      bookings: stats.bookings,
      revenue: Math.round(stats.revenue * 100) / 100,
    }));

    setProfessionalPerformance(professionalPerformanceArray);

    // Find top professionals
    if (professionalPerformanceArray.length > 0) {
      const topByBookings = professionalPerformanceArray.reduce(
        (max, current) => (current.bookings > max.bookings ? current : max),
      );

      const topByRevenue = professionalPerformanceArray.reduce(
        (max, current) => (current.revenue > max.revenue ? current : max),
      );

      setTopProfessionals({
        byBookings: topByBookings,
        byRevenue: topByRevenue,
      });
    }
  }, [
    allBookings,
    colors.accent.main,
    colors.error.main,
    colors.status.confirmed,
    resolveProfessionalName,
    serviceMap,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await loadServicePrices();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [loadServicePrices]);

  useEffect(() => {
    calculateStatistics();
  }, [calculateStatistics]);

  const StatCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card
      sx={{
        backgroundColor: colors.background.medium,
        borderRadius: "15px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        height: "100%",
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography
              variant="body2"
              sx={{ color: colors.text.secondary, mb: 1 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{ color: colors.text.primary, fontWeight: "bold" }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: "12px",
              p: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  interface TooltipPayload {
    payload: DailyBooking;
    value: number;
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: TooltipPayload[];
  }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: colors.background.card,
            border: `1px solid ${colors.border.main}`,
            borderRadius: "8px",
            padding: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: colors.text.primary, fontWeight: "bold" }}
          >
            {payload[0].payload.displayDate}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.accent.main }}>
            Bookings: {payload[0].value}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "1400px", margin: "0 auto", mb: 4 }}>
      <Typography
        variant="h4"
        sx={{
          color: colors.text.primary,
          fontWeight: "bold",
          mb: 3,
          textAlign: "center",
        }}
      >
        📊 Booking Statistics (Last 30 Days)
      </Typography>

      {/* Stats Cards */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          mb: 4,
          justifyContent: "center",
        }}
      >
        <Box sx={{ flex: "1 1 220px", minWidth: "220px", maxWidth: "280px" }}>
          <StatCard
            title="Total Bookings"
            value={stats.total}
            icon={
              <CalendarMonthIcon
                sx={{ fontSize: 40, color: colors.accent.main }}
              />
            }
            color={colors.accent.main}
          />
        </Box>
        <Box sx={{ flex: "1 1 220px", minWidth: "220px", maxWidth: "280px" }}>
          <StatCard
            title="Confirmed"
            value={stats.confirmed}
            icon={
              <CheckCircleIcon
                sx={{ fontSize: 40, color: colors.status.confirmed }}
              />
            }
            color={colors.status.confirmed}
          />
        </Box>
        <Box sx={{ flex: "1 1 220px", minWidth: "220px", maxWidth: "280px" }}>
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={
              <PendingIcon sx={{ fontSize: 40, color: colors.accent.main }} />
            }
            color={colors.accent.main}
          />
        </Box>
        <Box sx={{ flex: "1 1 220px", minWidth: "220px", maxWidth: "280px" }}>
          <StatCard
            title="Cancelled"
            value={stats.cancelled}
            icon={
              <TrendingUpIcon sx={{ fontSize: 40, color: colors.error.main }} />
            }
            color={colors.error.main}
          />
        </Box>
      </Box>

      {/* Revenue Stats Cards */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          mb: 4,
          justifyContent: "center",
        }}
      >
        <Box sx={{ flex: "1 1 280px", minWidth: "280px", maxWidth: "350px" }}>
          <Card
            sx={{
              backgroundColor: colors.background.medium,
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              height: "100%",
            }}
          >
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: colors.text.secondary, mb: 1 }}
                  >
                    Revenue (Last 30 Days)
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ color: colors.status.confirmed, fontWeight: "bold" }}
                  >
                    ${revenueStats.past30Days.toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: `${colors.status.confirmed}20`,
                    borderRadius: "12px",
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AttachMoneyIcon
                    sx={{ fontSize: 40, color: colors.status.confirmed }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: "1 1 280px", minWidth: "280px", maxWidth: "350px" }}>
          <Card
            sx={{
              backgroundColor: colors.background.medium,
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              height: "100%",
            }}
          >
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: colors.text.secondary, mb: 1 }}
                  >
                    Projected (Next 30 Days)
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ color: colors.accent.main, fontWeight: "bold" }}
                  >
                    ${revenueStats.projected30Days.toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: `${colors.accent.main}20`,
                    borderRadius: "12px",
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingUpIcon
                    sx={{ fontSize: 40, color: colors.accent.main }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: "1 1 280px", minWidth: "280px", maxWidth: "350px" }}>
          <Card
            sx={{
              backgroundColor: colors.background.medium,
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              height: "100%",
            }}
          >
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: colors.text.secondary, mb: 1 }}
                  >
                    Avg Revenue/Booking
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ color: colors.text.primary, fontWeight: "bold" }}
                  >
                    ${revenueStats.averagePerBooking.toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: `${colors.text.secondary}20`,
                    borderRadius: "12px",
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AttachMoneyIcon
                    sx={{ fontSize: 40, color: colors.text.secondary }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Best Performing Months */}
      {bestMonths.byBookings && bestMonths.byRevenue && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            mb: 4,
            justifyContent: "center",
          }}
        >
          <Box sx={{ flex: "1 1 400px", minWidth: "350px", maxWidth: "550px" }}>
            <Card
              sx={{
                backgroundColor: colors.background.medium,
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                height: "100%",
                border: `2px solid ${colors.accent.main}40`,
              }}
            >
              <CardContent>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: colors.text.primary,
                      mb: 2,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    🏆 Best Month by Bookings
                  </Typography>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{ color: colors.accent.main, fontWeight: "bold" }}
                      >
                        {bestMonths.byBookings.displayMonth}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ color: colors.text.secondary, mt: 1 }}
                      >
                        {bestMonths.byBookings.bookings} bookings
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: colors.text.secondary, mt: 0.5 }}
                      >
                        ${bestMonths.byBookings.revenue.toLocaleString()}{" "}
                        revenue
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        backgroundColor: `${colors.accent.main}20`,
                        borderRadius: "12px",
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CalendarMonthIcon
                        sx={{ fontSize: 50, color: colors.accent.main }}
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: "1 1 400px", minWidth: "350px", maxWidth: "550px" }}>
            <Card
              sx={{
                backgroundColor: colors.background.medium,
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                height: "100%",
                border: `2px solid ${colors.status.confirmed}40`,
              }}
            >
              <CardContent>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: colors.text.primary,
                      mb: 2,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    💰 Best Month by Revenue
                  </Typography>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{
                          color: colors.status.confirmed,
                          fontWeight: "bold",
                        }}
                      >
                        {bestMonths.byRevenue.displayMonth}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ color: colors.text.secondary, mt: 1 }}
                      >
                        ${bestMonths.byRevenue.revenue.toLocaleString()} revenue
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: colors.text.secondary, mt: 0.5 }}
                      >
                        {bestMonths.byRevenue.bookings} bookings
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        backgroundColor: `${colors.status.confirmed}20`,
                        borderRadius: "12px",
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AttachMoneyIcon
                        sx={{ fontSize: 50, color: colors.status.confirmed }}
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Monthly Performance Bar Chart */}
      {monthlyPerformance.length > 0 && (
        <Box sx={{ flex: "1 1 100%", width: "100%", mb: 4 }}>
          <Card
            sx={{
              backgroundColor: colors.background.medium,
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              p: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: colors.text.primary, mb: 3, fontWeight: "bold" }}
            >
              📈 Monthly Performance Overview
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyPerformance}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.border.main}
                  opacity={0.3}
                />
                <XAxis
                  dataKey="displayMonth"
                  stroke={colors.text.secondary}
                  tick={{ fill: colors.text.secondary, fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  yAxisId="left"
                  stroke={colors.text.secondary}
                  tick={{ fill: colors.text.secondary }}
                  label={{
                    value: "Bookings",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: colors.text.secondary },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={colors.text.secondary}
                  tick={{ fill: colors.text.secondary }}
                  label={{
                    value: "Revenue ($)",
                    angle: 90,
                    position: "insideRight",
                    style: { fill: colors.text.secondary },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.background.card,
                    border: `1px solid ${colors.border.main}`,
                    borderRadius: "8px",
                    color: colors.text.primary,
                  }}
                  formatter={(value: number | string, name: string) => {
                    if (name === "revenue")
                      return [`$${Number(value).toLocaleString()}`, "Revenue"];
                    if (name === "bookings") return [Number(value), "Bookings"];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="bookings"
                  fill={colors.accent.main}
                  radius={[8, 8, 0, 0]}
                  name="Bookings"
                />
                <Bar
                  yAxisId="right"
                  dataKey="revenue"
                  fill={colors.status.confirmed}
                  radius={[8, 8, 0, 0]}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Box>
      )}

      {/* Cancellation Statistics */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          mb: 4,
        }}
      >
        {/* Overall Cancellation Rate Card */}
        <Box sx={{ flex: "1 1 400px", minWidth: "350px", maxWidth: "550px" }}>
          <Card
            sx={{
              backgroundColor: colors.background.medium,
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              height: "100%",
              border: `2px solid ${colors.error.main}40`,
            }}
          >
            <CardContent>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    color: colors.text.primary,
                    mb: 2,
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  ⚠️ Overall Cancellation Rate
                </Typography>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      variant="h2"
                      sx={{ color: colors.error.main, fontWeight: "bold" }}
                    >
                      {cancellationRate.toFixed(2)}%
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: colors.text.secondary, mt: 1 }}
                    >
                      {
                        allBookings.filter((b) => b.status === "cancelled")
                          .length
                      }{" "}
                      cancelled out of {allBookings.length} total bookings
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: `${colors.error.main}20`,
                      borderRadius: "50%",
                      p: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 100,
                      height: 100,
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{ color: colors.error.main, fontWeight: "bold" }}
                    >
                      {cancellationRate.toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Cancellation Rate by Service */}
        {serviceCancellations.length > 0 && (
          <Box sx={{ flex: "1 1 100%", width: "100%" }}>
            <Card
              sx={{
                backgroundColor: colors.background.medium,
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                p: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{ color: colors.text.primary, mb: 3, fontWeight: "bold" }}
              >
                🎯 Cancellation Rate by Service
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={serviceCancellations}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.border.main}
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="serviceName"
                    stroke={colors.text.secondary}
                    tick={{ fill: colors.text.secondary, fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    stroke={colors.text.secondary}
                    tick={{ fill: colors.text.secondary }}
                    label={{
                      value: "Cancellation Rate (%)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: colors.text.secondary },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.background.card,
                      border: `1px solid ${colors.border.main}`,
                      borderRadius: "8px",
                      color: colors.text.primary,
                    }}
                    formatter={(value: number | string, name: string) => {
                      return [value, name];
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]
                          .payload as ServiceCancellationData;
                        return (
                          <Box
                            sx={{
                              backgroundColor: colors.background.card,
                              border: `1px solid ${colors.border.main}`,
                              borderRadius: "8px",
                              padding: "10px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: colors.text.primary,
                                fontWeight: "bold",
                              }}
                            >
                              {data.serviceName}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: colors.error.main }}
                            >
                              Cancellation Rate:{" "}
                              {data.cancellationRate.toFixed(2)}%
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: colors.text.secondary }}
                            >
                              Cancelled: {data.cancelledBookings} /{" "}
                              {data.totalBookings}
                            </Typography>
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="cancellationRate"
                    fill={colors.error.main}
                    radius={[8, 8, 0, 0]}
                    name="Cancellation Rate (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Box>
        )}
      </Box>

      {/* Top Professionals */}
      {topProfessionals.byBookings && topProfessionals.byRevenue && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            mb: 4,
          }}
        >
          {/* Most Booked Professional */}
          <Box sx={{ flex: "1 1 400px", minWidth: "350px", maxWidth: "550px" }}>
            <Card
              sx={{
                backgroundColor: colors.background.medium,
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                height: "100%",
                border: `2px solid ${colors.accent.main}40`,
              }}
            >
              <CardContent>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: colors.text.primary,
                      mb: 2,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    👤 Most Booked Professional
                  </Typography>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{ color: colors.accent.main, fontWeight: "bold" }}
                      >
                        {topProfessionals.byBookings.name}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ color: colors.text.secondary, mt: 1 }}
                      >
                        {topProfessionals.byBookings.bookings} total bookings
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: colors.text.secondary, mt: 0.5 }}
                      >
                        ${topProfessionals.byBookings.revenue.toLocaleString()}{" "}
                        revenue
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        backgroundColor: `${colors.accent.main}20`,
                        borderRadius: "12px",
                        p: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 100,
                      }}
                    >
                      <Typography
                        variant="h3"
                        sx={{ color: colors.accent.main, fontWeight: "bold" }}
                      >
                        {topProfessionals.byBookings.bookings}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: colors.text.secondary }}
                      >
                        bookings
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Highest Revenue Professional */}
          <Box sx={{ flex: "1 1 400px", minWidth: "350px", maxWidth: "550px" }}>
            <Card
              sx={{
                backgroundColor: colors.background.medium,
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                height: "100%",
                border: `2px solid ${colors.status.confirmed}40`,
              }}
            >
              <CardContent>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: colors.text.primary,
                      mb: 2,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    💵 Highest Revenue Professional
                  </Typography>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{
                          color: colors.status.confirmed,
                          fontWeight: "bold",
                        }}
                      >
                        {topProfessionals.byRevenue.name}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ color: colors.text.secondary, mt: 1 }}
                      >
                        ${topProfessionals.byRevenue.revenue.toLocaleString()}{" "}
                        revenue
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: colors.text.secondary, mt: 0.5 }}
                      >
                        {topProfessionals.byRevenue.bookings} bookings
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        backgroundColor: `${colors.status.confirmed}20`,
                        borderRadius: "12px",
                        p: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 100,
                      }}
                    >
                      <AttachMoneyIcon
                        sx={{ fontSize: 50, color: colors.status.confirmed }}
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Professional Performance Chart */}
      {professionalPerformance.length > 0 && (
        <Box sx={{ flex: "1 1 100%", width: "100%", mb: 4 }}>
          <Card
            sx={{
              backgroundColor: colors.background.medium,
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              p: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: colors.text.primary, mb: 3, fontWeight: "bold" }}
            >
              👥 Professional Performance (All Time)
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={professionalPerformance}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.border.main}
                  opacity={0.3}
                />
                <XAxis
                  dataKey="name"
                  stroke={colors.text.secondary}
                  tick={{ fill: colors.text.secondary }}
                />
                <YAxis
                  yAxisId="left"
                  stroke={colors.text.secondary}
                  tick={{ fill: colors.text.secondary }}
                  label={{
                    value: "Bookings",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: colors.text.secondary },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={colors.text.secondary}
                  tick={{ fill: colors.text.secondary }}
                  label={{
                    value: "Revenue ($)",
                    angle: 90,
                    position: "insideRight",
                    style: { fill: colors.text.secondary },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.background.card,
                    border: `1px solid ${colors.border.main}`,
                    borderRadius: "8px",
                    color: colors.text.primary,
                  }}
                  formatter={(value: number | string, name: string) => {
                    if (name === "Revenue")
                      return [`$${Number(value).toLocaleString()}`, "Revenue"];
                    if (name === "Bookings") return [Number(value), "Bookings"];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="bookings"
                  fill={colors.accent.main}
                  radius={[8, 8, 0, 0]}
                  name="Bookings"
                />
                <Bar
                  yAxisId="right"
                  dataKey="revenue"
                  fill={colors.status.confirmed}
                  radius={[8, 8, 0, 0]}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Box>
      )}

      {/* Charts */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
        }}
      >
        {/* Daily Bookings Area Chart */}
        <Box sx={{ flex: "1 1 600px", minWidth: "300px" }}>
          <Card
            sx={{
              backgroundColor: colors.background.medium,
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              p: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: colors.text.primary, mb: 3, fontWeight: "bold" }}
            >
              📈 Daily Bookings Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyBookings}>
                <defs>
                  <linearGradient
                    id="colorBookings"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colors.accent.main}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={colors.accent.main}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.border.main}
                  opacity={0.3}
                />
                <XAxis
                  dataKey="displayDate"
                  stroke={colors.text.secondary}
                  tick={{ fill: colors.text.secondary, fontSize: 12 }}
                  interval={Math.floor(dailyBookings.length / 10)}
                />
                <YAxis
                  stroke={colors.text.secondary}
                  tick={{ fill: colors.text.secondary }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={colors.accent.main}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBookings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Box>

        {/* Status Distribution Pie Chart */}
        <Box sx={{ flex: "1 1 350px", minWidth: "300px" }}>
          <Card
            sx={{
              backgroundColor: colors.background.medium,
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              p: 3,
              height: "100%",
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: colors.text.primary, mb: 2, fontWeight: "bold" }}
            >
              📊 Status Distribution
            </Typography>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height={250}
              >
                <Typography sx={{ color: colors.text.secondary }}>
                  No data available
                </Typography>
              </Box>
            )}
          </Card>
        </Box>

        {/* Projected Income Chart */}
        {projectedIncome.length > 0 && (
          <Box sx={{ flex: "1 1 100%", width: "100%" }}>
            <Card
              sx={{
                backgroundColor: colors.background.medium,
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                p: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{ color: colors.text.primary, mb: 3, fontWeight: "bold" }}
              >
                💰 Projected Income (Next 30 Days)
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: colors.text.secondary, mb: 2 }}
              >
                Based on historical booking trends and average service prices
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={projectedIncome}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={colors.status.confirmed}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={colors.status.confirmed}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.border.main}
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="displayDate"
                    stroke={colors.text.secondary}
                    tick={{ fill: colors.text.secondary, fontSize: 12 }}
                    interval={Math.floor(projectedIncome.length / 10)}
                  />
                  <YAxis
                    stroke={colors.text.secondary}
                    tick={{ fill: colors.text.secondary }}
                    label={{
                      value: "Revenue ($)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: colors.text.secondary },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.background.card,
                      border: `1px solid ${colors.border.main}`,
                      borderRadius: "8px",
                      color: colors.text.primary,
                    }}
                    formatter={(value: number | string, name: string) => {
                      if (name === "revenue")
                        return [
                          `$${Number(value).toFixed(2)}`,
                          "Projected Revenue",
                        ];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={colors.status.confirmed}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Projected Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Box>
        )}

        {/* Bookings by Professional Bar Chart */}
        {professionalData.length > 0 && (
          <Box sx={{ flex: "1 1 100%", width: "100%" }}>
            <Card
              sx={{
                backgroundColor: colors.background.medium,
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                p: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{ color: colors.text.primary, mb: 3, fontWeight: "bold" }}
              >
                👥 Professional Performance (Last 30 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={professionalData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.border.main}
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="name"
                    stroke={colors.text.secondary}
                    tick={{ fill: colors.text.secondary }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke={colors.text.secondary}
                    tick={{ fill: colors.text.secondary }}
                    allowDecimals={false}
                    label={{
                      value: "Bookings",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: colors.text.secondary },
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={colors.text.secondary}
                    tick={{ fill: colors.text.secondary }}
                    label={{
                      value: "Revenue ($)",
                      angle: 90,
                      position: "insideRight",
                      style: { fill: colors.text.secondary },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.background.card,
                      border: `1px solid ${colors.border.main}`,
                      borderRadius: "8px",
                      color: colors.text.primary,
                    }}
                    formatter={(value: number | string, name: string) => {
                      if (name === "Revenue")
                        return [
                          `$${Number(value).toLocaleString()}`,
                          "Revenue",
                        ];
                      if (name === "Bookings")
                        return [Number(value), "Bookings"];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    fill={colors.accent.main}
                    radius={[8, 8, 0, 0]}
                    name="Bookings"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    fill={colors.status.confirmed}
                    radius={[8, 8, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
}
