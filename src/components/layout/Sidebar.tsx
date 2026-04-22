import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/generator", label: "Generator" },
  { href: "/chat", label: "Chat" },
  { href: "/publish", label: "Publish" },
  { href: "/analytics", label: "Analytics" },
  { href: "/site", label: "Site" },
  { href: "/strategy", label: "竞争策略分析" },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 md:block">
      <div className="flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500" />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-zinc-900">GEO Growth</div>
          <div className="text-xs text-zinc-500">MVP</div>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
        <div className="font-semibold text-zinc-800">Demo tips</div>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>先去 Products 添加商品</li>
          <li>Generator 生成 3 类内容</li>
          <li>Publish 选择平台一键发布</li>
          <li>Analytics 看 AI mentions</li>
        </ul>
      </div>
    </aside>
  );
}

