import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  day: integer("day").notNull(),
  department: text("department").notNull(),
  level: integer("level").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  course: text("course").notNull(),
  instructor: text("instructor").notNull(),
  room: text("room").notNull(),
  groupName: text("group_name").notNull().default(""),
  kind: text("kind").notNull().default("محاضرة"),
  source: text("source").notNull().default("إضافة يدوية"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const members = sqliteTable("members", {
  email: text("email").primaryKey(),
  role: text("role").notNull(),
  canEdit: integer("can_edit").notNull().default(0),
});

export const cancellations = sqliteTable("cancellations", {
  entryId: text("entry_id").notNull(),
  date: text("date").notNull(),
  reason: text("reason").notNull().default(""),
  cancelledBy: text("cancelled_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.entryId, table.date] })]);

export const accounts = sqliteTable("accounts", {
 id: text("id").primaryKey(), username: text("username").notNull().unique(), name: text("name").notNull(),
 passwordHash: text("password_hash").notNull(), role: text("role").notNull(), department: text("department").notNull(),
 instructorId: text("instructor_id"), level: integer("level").notNull(), canEdit: integer("can_edit").notNull().default(0), active: integer("active").notNull().default(1)
});
export const sessions = sqliteTable("sessions", { token: text("token").primaryKey(), accountId: text("account_id").notNull().references(()=>accounts.id), expires: integer("expires").notNull() });
export const locations = sqliteTable("locations", { entryId:text("entry_id").notNull(), date:text("date").notNull(), room:text("room").notNull(), reason:text("reason").notNull(), changedBy:text("changed_by").notNull() }, t=>[primaryKey({columns:[t.entryId,t.date]})]);
export const loginAttempts = sqliteTable("login_attempts", { key:text("key").primaryKey(), count:integer("count").notNull(), until:integer("until").notNull() });

export const auditEvents = sqliteTable("audit_events", {
 id:text("id").primaryKey(),entryId:text("entry_id").notNull(),occurrenceDate:text("occurrence_date"),action:text("action").notNull(),
 actorId:text("actor_id").notNull(),actorName:text("actor_name").notNull(),actorUsername:text("actor_username").notNull(),occurredAt:text("occurred_at").notNull(),
 department:text("department").notNull(),level:integer("level").notNull(),entryJson:text("entry_json").notNull(),beforeJson:text("before_json").notNull(),afterJson:text("after_json").notNull()
});

export const instructors = sqliteTable("instructors", {
 id:text("id").primaryKey(),name:text("name").notNull(),title:text("title").notNull().default(""),
 scheduleName:text("schedule_name").notNull(),aliasesJson:text("aliases_json").notNull().default("[]")
});
export const teachingAssignments = sqliteTable("teaching_assignments", {
 accountId:text("account_id").notNull().references(()=>accounts.id),entryId:text("entry_id").notNull()
},t=>[primaryKey({columns:[t.accountId,t.entryId]})]);

export const notifications = sqliteTable("notifications", {
 id:text("id").primaryKey(),accountId:text("account_id").notNull().references(()=>accounts.id),
 action:text("action").notNull(),entryId:text("entry_id").notNull(),occurrenceDate:text("occurrence_date").notNull(),
 actorId:text("actor_id").notNull(),actorName:text("actor_name").notNull(),entryJson:text("entry_json").notNull(),
 reason:text("reason").notNull().default(""),createdAt:text("created_at").notNull(),readAt:text("read_at")
},t=>[index("idx_notifications_account_created").on(t.accountId,t.createdAt)]);
