"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal as React.ElementType;
const DropdownMenuContentPrimitive =
  DropdownMenuPrimitive.Content as React.ElementType;
const DropdownMenuItemPrimitive = DropdownMenuPrimitive.Item as React.ElementType;
const DropdownMenuSeparatorPrimitive =
  DropdownMenuPrimitive.Separator as React.ElementType;

type DropdownMenuContentProps = {
  className?: string;
  sideOffset?: number;
  children?: React.ReactNode;
  [key: string]: unknown;
};

type DropdownMenuItemProps = {
  className?: string;
  inset?: boolean;
  children?: React.ReactNode;
  [key: string]: unknown;
};

type DropdownMenuSeparatorProps = {
  className?: string;
  [key: string]: unknown;
};

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPortal>
    <DropdownMenuContentPrimitive
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-fade-in data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:scale-100",
        className
      )}
      {...props}
    />
  </DropdownMenuPortal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuItemPrimitive
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <DropdownMenuSeparatorPrimitive
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
