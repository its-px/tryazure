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
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { getColors } from "../../theme";
import dayjs from "dayjs";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

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
}

interface ProjectedIncomeData {
  date: string;
  displayDate: string;
  revenue: number;
  bookings: number;
}

export default function BookingStatistics({
  allBookings,
}: BookingStatisticsProps) {
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);

  const [dailyBookings, setDailyBookings] = useState<DailyBooking[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [professionalData, setProfessionalData] = useState<ProfessionalData[]>(
    []
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
    []
  );
  const [revenueStats, setRevenueStats] = useState({
    past30Days: 0,
    projected30Days: 0,
    averagePerBooking: 0,
  });

  const loadServicePrices = useCallback(async () => {
    try {
      const { supabase } = await import("../components/supabaseClient");
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price");

      if (error) {
        console.error("Error loading service prices:", error);
        return;
      }

      const map: Record<string, { name: string; price: number }> = {};
      data?.forEach((service) => {
        map[service.id] = { name: service.name, price: service.price || 0 };
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
      })
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

    // Calculate bookings by professional
    const professionalCount: Record<string, number> = {};
    recentBookings.forEach((booking) => {
      const profId = booking.professional_id;
      professionalCount[profId] = (professionalCount[profId] || 0) + 1;
    });

    const profData: ProfessionalData[] = Object.entries(professionalCount).map(
      ([profId, count]) => ({
        name:
          profId === "prof1"
            ? "Person 1"
            : profId === "prof2"
            ? "Person 2"
            : profId,
        bookings: count,
      })
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
      (b) => b.status === "confirmed" || b.status === "pending"
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
  }, [
    allBookings,
    colors.accent.main,
    colors.error.main,
    colors.status.confirmed,
    serviceMap,
  ]);

  useEffect(() => {
    loadServicePrices();
  }, [loadServicePrices]);

  useEffect(() => {
    if (Object.keys(serviceMap).length > 0) {
      calculateStatistics();
    }
  }, [calculateStatistics, serviceMap]);

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
                👥 Bookings by Professional
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
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
                    stroke={colors.text.secondary}
                    tick={{ fill: colors.text.secondary }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.background.card,
                      border: `1px solid ${colors.border.main}`,
                      borderRadius: "8px",
                      color: colors.text.primary,
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="bookings"
                    fill={colors.accent.main}
                    radius={[8, 8, 0, 0]}
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
