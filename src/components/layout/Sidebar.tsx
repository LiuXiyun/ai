"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { href: "/chat", label: "Chat" },
  { href: "/strategy-v2", label: "分层策略分析" },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden shrink-0 border-r border-zinc-200 bg-white px-2 py-4 transition-all duration-200 md:block ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="mb-3 flex items-center justify-end px-1">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 ${
              collapsed ? "text-center" : ""
            }`}
            title={item.label}
          >
            {collapsed ? item.label.slice(0, 1) : item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

