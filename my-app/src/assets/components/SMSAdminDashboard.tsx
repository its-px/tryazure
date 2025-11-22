import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { supabase } from "./supabaseClient";

interface SMSStats {
  total: number;
  delivered: number;
  failed: number;
  today: number;
  costs: Record<string, number>;
}

interface SMSLog {
  id: number;
  gateway_message_id: number;
  recipient_phone: string;
  message_type: string;
  delivery_status: string;
  sender_name: string;
  cost_amount: number;
  cost_currency: string;
  delivered_at: string;
  error_message: string;
  created_at: string;
}

interface SMSTemplate {
  id: number;
  name: string;
  template_type: string;
  message_template: string;
  sender_name: string;
  is_active: boolean;
  created_at: string;
}

const SMSAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<SMSStats | null>(null);
  const [recentSMS, setRecentSMS] = useState<SMSLog[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Test SMS state
  const [testPhone, setTestPhone] = useState("+4512345678");
  const [testMessage, setTestMessage] = useState("");
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sms-admin", {
        body: { action: "stats" },
      });

      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error("Error loading stats:", err);
      setError("Failed to load SMS statistics");
    }
  };

  const loadRecentSMS = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sms-admin", {
        body: { action: "recent" },
      });

      if (error) throw error;
      setRecentSMS(data || []);
    } catch (err) {
      console.error("Error loading recent SMS:", err);
      setError("Failed to load recent SMS logs");
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sms-admin", {
        body: { action: "templates" },
      });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Error loading templates:", err);
      setError("Failed to load SMS templates");
    }
  };

  const sendTestSMS = async () => {
    if (!testPhone) {
      setError("Phone number is required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase.functions.invoke("sms-admin", {
        body: {
          action: "test",
          phoneNumber: testPhone,
          message: testMessage || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        setSuccess(
          `Test SMS sent successfully! Message ID: ${data.result.messageId}`
        );
        setTestDialogOpen(false);
        // Reload recent SMS to show the test message
        setTimeout(loadRecentSMS, 2000);
      } else {
        setError(
          `Failed to send test SMS: ${data.result.error || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Error sending test SMS:", err);
      setError("Failed to send test SMS");
    } finally {
      setLoading(false);
    }
  };

  const triggerReminders = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase.functions.invoke("sms-admin", {
        body: { action: "reminders" },
      });

      if (error) throw error;

      if (data.success) {
        setSuccess(
          `Reminder check completed. Sent ${
            data.result.reminders_sent || 0
          } reminders.`
        );
        setTimeout(() => {
          loadStats();
          loadRecentSMS();
        }, 1000);
      } else {
        setError(
          `Reminder process failed: ${data.result.error || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Error triggering reminders:", err);
      setError("Failed to trigger reminder process");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "success";
      case "FAILED":
        return "error";
      case "SENT":
        return "info";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  useEffect(() => {
    loadStats();
    loadRecentSMS();
    loadTemplates();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        SMS Administration Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Recent Messages" />
        <Tab label="Templates" />
        <Tab label="Actions" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  SMS Statistics
                </Typography>
                {stats ? (
                  <Box>
                    <Typography>Total SMS Sent: {stats.total}</Typography>
                    <Typography>
                      Successfully Delivered: {stats.delivered}
                    </Typography>
                    <Typography>Failed: {stats.failed}</Typography>
                    <Typography>Today: {stats.today}</Typography>

                    {Object.keys(stats.costs).length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">
                          Total Costs:
                        </Typography>
                        {Object.entries(stats.costs).map(
                          ([currency, amount]) => (
                            <Typography key={currency}>
                              {currency}: {amount.toFixed(4)}
                            </Typography>
                          )
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <CircularProgress size={24} />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
                  <Button
                    variant="contained"
                    onClick={() => setTestDialogOpen(true)}
                    disabled={loading}
                  >
                    Send Test SMS
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={triggerReminders}
                    disabled={loading}
                  >
                    {loading ? (
                      <CircularProgress size={20} />
                    ) : (
                      "Check & Send Reminders"
                    )}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      loadStats();
                      loadRecentSMS();
                      loadTemplates();
                    }}
                  >
                    Refresh Data
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent SMS Messages
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Phone</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Sender</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>Sent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentSMS.map((sms) => (
                    <TableRow key={sms.id}>
                      <TableCell>{sms.recipient_phone}</TableCell>
                      <TableCell>{sms.message_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={sms.delivery_status}
                          color={
                            getStatusColor(sms.delivery_status) as
                              | "success"
                              | "error"
                              | "info"
                              | "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{sms.sender_name}</TableCell>
                      <TableCell>
                        {sms.cost_amount && sms.cost_currency
                          ? `${sms.cost_amount} ${sms.cost_currency}`
                          : "-"}
                      </TableCell>
                      <TableCell>{formatDate(sms.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {recentSMS.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No SMS messages found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              SMS Templates
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Sender</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Preview</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{template.template_type}</TableCell>
                      <TableCell>{template.sender_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={template.is_active ? "Active" : "Inactive"}
                          color={template.is_active ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {template.message_template}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Manual Actions
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
                  <Button
                    variant="contained"
                    onClick={() => setTestDialogOpen(true)}
                    disabled={loading}
                    color="primary"
                  >
                    Send Test SMS
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={triggerReminders}
                    disabled={loading}
                    color="secondary"
                  >
                    Trigger Reminder Check
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuration
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Gateway API webhook URL:
                  <br />
                  <code>
                    https://qrvxmqksekxbtipdnfru.supabase.co/functions/v1/gateway-webhook
                  </code>
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mt: 2 }}
                >
                  Configure this URL in your Gateway API dashboard under
                  Webhooks.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Send Test SMS</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Phone Number"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+4512345678"
            margin="normal"
          />
          <TextField
            fullWidth
            label="Custom Message (optional)"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Leave empty to use default test message"
            multiline
            rows={3}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={sendTestSMS}
            variant="contained"
            disabled={loading || !testPhone}
          >
            {loading ? <CircularProgress size={20} /> : "Send Test SMS"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SMSAdminDashboard;
