import Link from "next/link";

const roles = [
  {
    href: "/guard/login",
    title: "Security Guard",
    subtitle: "Tablet verification app",
    icon: "🛡️",
    color: "from-slate-800 to-slate-900",
    primary: true,
  },
  {
    href: "/host/login",
    title: "Host Portal",
    subtitle: "Register & approve visitors",
    icon: "👤",
    color: "from-blue-600 to-blue-700",
  },
  {
    href: "/admin/login",
    title: "Admin Dashboard",
    subtitle: "Occupancy, logs & analytics",
    icon: "📊",
    color: "from-emerald-600 to-emerald-700",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              IIM Lucknow
            </p>
            <h1 className="text-xl font-bold text-slate-900">SVAP</h1>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            MVP Phase 1
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Secure Visitor Access Platform
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Zero friction for legitimate visitors. Maximum control for campus security.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.href}
              href={role.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${role.color} p-8 text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl`}
            >
              {role.primary && (
                <span className="absolute right-4 top-4 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  Primary
                </span>
              )}
              <div className="text-4xl">{role.icon}</div>
              <h3 className="mt-4 text-2xl font-bold">{role.title}</h3>
              <p className="mt-2 text-sm text-white/80">{role.subtitle}</p>
              <p className="mt-6 text-sm font-medium text-white/90 group-hover:underline">
                Open →
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">MVP Workflows Supported</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Planned Visitors", "Host registers → QR pass → Guard scans"],
              ["Unplanned Visitors", "Phone lookup → Host approves in <20s"],
              ["Recurring Access", "Pre-authorized vendor/contractor passes"],
              ["Emergency Entry", "Guard override with mandatory audit log"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Gate processing target: &lt;8 sec · Verification target: &lt;3 sec
        </p>
      </main>
    </div>
  );
}
