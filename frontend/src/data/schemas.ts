export interface Schema {
  name: string;
  description: string;
}

export const schemas: Schema[] = [
  {
    name: "E-commerce Analytics",
    description: `
Table: users
- id (bigint, PK)
- name (text)
- email (text)
- created_at (timestamp)

Table: events
- id (bigint, PK)
- user_id (bigint, FK to users.id)
- name (text) -- Event name like 'page_view', 'add_to_cart', 'purchase'
- properties (jsonb) -- Product ID, price, etc.
- occurred_at (timestamp)
    `.trim(),
  },
  {
    name: "Social Media App",
    description: `
Table: users
- user_id (uuid, PK)
- username (varchar)
- display_name (varchar)
- created_at (timestamptz)

Table: posts
- post_id (uuid, PK)
- user_id (uuid, FK to users.user_id)
- content (text)
- created_at (timestamptz)

Table: likes
- like_id (uuid, PK)
- user_id (uuid, FK to users.user_id)
- post_id (uuid, FK to posts.post_id)
- created_at (timestamptz)
    `.trim(),
  },
  {
    name: "Project Management",
    description: `
Table: projects
- project_id (int, PK)
- project_name (varchar)
- start_date (date)
- end_date (date)

Table: tasks
- task_id (int, PK)
- project_id (int, FK to projects.project_id)
- task_name (varchar)
- status (varchar) -- e.g., 'todo', 'in_progress', 'done'
- due_date (date)

Table: assignees
- assignment_id (int, PK)
- task_id (int, FK to tasks.task_id)
- user_id (int)
    `.trim(),
  },
];
