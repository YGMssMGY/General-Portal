"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Handshake, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { format } from "date-fns";

interface CooperationRequest {
  id: string;
  clubName: string;
  contactName: string;
  email: string;
  eventTitle: string;
  description: string;
  proposedDate: string;
  resourcesNeeded: string;
  status: "pending" | "approved" | "rejected";
  createdBy: { id: string; name: string | null };
  createdAt: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function CooperationPage() {
  const portal = usePortal();
  usePageTitle("Cooperation | General Portal");
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(isAdmin ? "manage" : "submit");
  const [statusFilter, setStatusFilter] = useState("all");

  const [clubName, setClubName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [resourcesNeeded, setResourcesNeeded] = useState("");

  const { data, isLoading, isError } = useQuery<CooperationRequest[]>({
    queryKey: [portal, "cooperation"],
    queryFn: () => fetchJson<CooperationRequest[]>(`/api/cooperation`),
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      clubName: string;
      contactName: string;
      email: string;
      eventTitle: string;
      description: string;
      proposedDate: string;
      resourcesNeeded: string;
    }) =>
      fetchJson<CooperationRequest>(`/api/cooperation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "cooperation"] });
      setClubName("");
      setContactName("");
      setEmail("");
      setEventTitle("");
      setDescription("");
      setProposedDate("");
      setResourcesNeeded("");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetchJson(`/api/cooperation/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "cooperation"] });
    },
  });

  function handleSubmit() {
    if (!clubName.trim() || !contactName.trim() || !email.trim() || !eventTitle.trim()) return;
    createMutation.mutate({
      clubName: clubName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      eventTitle: eventTitle.trim(),
      description: description.trim(),
      proposedDate,
      resourcesNeeded: resourcesNeeded.trim(),
    });
  }

  const requests = data ?? [];
  const filtered =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Club Cooperation
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Submit and manage cooperation requests
          </p>
        </div>
        <Skeleton style={{ width: "100%", height: "300px", borderRadius: "5px" }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-destructive)",
            margin: 0,
          }}
        >
          Failed to load cooperation data.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          Club Cooperation
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            margin: "4px 0 0",
          }}
        >
          Submit and manage cooperation requests
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="submit">Submit Request</TabsTrigger>
          {isAdmin && <TabsTrigger value="manage">Manage Requests</TabsTrigger>}
        </TabsList>

        <TabsContent value="submit">
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    margin: 0,
                  }}
                >
                  Cooperation Request Form
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--color-text)",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      Club Name
                    </label>
                    <Input
                      placeholder="Your club name"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--color-text)",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      Contact Name
                    </label>
                    <Input
                      placeholder="Your name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--color-text)",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="Your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--color-text)",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      Proposed Date
                    </label>
                    <Input
                      type="date"
                      value={proposedDate}
                      onChange={(e) => setProposedDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--color-text)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Event Title
                  </label>
                  <Input
                    placeholder="Title of the event"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--color-text)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Description
                  </label>
                  <Textarea
                    placeholder="Describe the cooperation you're seeking"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--color-text)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Resources Needed
                  </label>
                  <Textarea
                    placeholder="What resources, space, or support do you need?"
                    value={resourcesNeeded}
                    onChange={(e) => setResourcesNeeded(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !clubName.trim() ||
                      !contactName.trim() ||
                      !email.trim() ||
                      !eventTitle.trim() ||
                      createMutation.isPending
                    }
                  >
                    {createMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="manage">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {filtered.length} request{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {filtered.length === 0 ? (
              <Card>
                <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                  <Handshake
                    size={32}
                    style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }}
                  />
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--color-text-secondary)",
                      margin: 0,
                    }}
                  >
                    No requests found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filtered.map((req) => (
                  <Card key={req.id}>
                    <CardContent style={{ padding: "20px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flexWrap: "wrap",
                              marginBottom: "6px",
                            }}
                          >
                            <h3
                              style={{
                                fontSize: "15px",
                                fontWeight: 600,
                                color: "var(--color-text)",
                                margin: 0,
                              }}
                            >
                              {req.eventTitle}
                            </h3>
                            <Badge
                              variant={
                                statusConfig[req.status]
                                  ?.variant as "default" | "secondary" | "destructive" | "outline"
                              }
                            >
                              {statusConfig[req.status]?.label ?? req.status}
                            </Badge>
                          </div>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "var(--color-text-secondary)",
                              margin: "0 0 4px",
                            }}
                          >
                            {req.clubName} &middot; Contact: {req.contactName} ({req.email})
                          </p>
                          {req.description && (
                            <p
                              style={{
                                fontSize: "13px",
                                color: "var(--color-text)",
                                margin: "4px 0",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {req.description}
                            </p>
                          )}
                          <div
                            style={{
                              display: "flex",
                              gap: "16px",
                              flexWrap: "wrap",
                              fontSize: "12px",
                              color: "var(--color-text-secondary)",
                              marginTop: "8px",
                            }}
                          >
                            {req.proposedDate && (
                              <span>
                                <strong style={{ color: "var(--color-text)" }}>
                                  Proposed date:{" "}
                                </strong>
                                {format(new Date(req.proposedDate), "MMM d, yyyy")}
                              </span>
                            )}
                            {req.resourcesNeeded && (
                              <span>
                                <strong style={{ color: "var(--color-text)" }}>
                                  Resources:{" "}
                                </strong>
                                {req.resourcesNeeded}
                              </span>
                            )}
                            <span>
                              <strong style={{ color: "var(--color-text)" }}>
                                Submitted:{" "}
                              </strong>
                              {format(new Date(req.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                      {req.status === "pending" && (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "16px",
                            paddingTop: "16px",
                            borderTop: "1px solid var(--color-border)",
                          }}
                        >
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: req.id,
                                status: "approved",
                              })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle size={14} />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: req.id,
                                status: "rejected",
                              })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle size={14} />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
