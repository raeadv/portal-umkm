import React, { useState } from "react";
import {
  AppShell,
  Drawer,
  Title,
  ScrollArea,
  Divider,
  Burger,
  Container,
  Group,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Menu, Menubar, Text } from "@mantine/core";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContexts";

const guestLinks = [
  { link: "/auth/login", label: "Login" },
  { link: "/auth/register", label: "Register" },
];

const authLinks = [
  { link: "/admin", label: "Dashboard" },
  { link: "/umkm", label: "Data UMKM" },
  { link: "/user-profile", label: "Profil User" },
];

export default function AppNavigation() {
  const auth = useAuth();
  const [opened, { toggle, close }] = useDisclosure(false);
  // derived on every render: a copy in state lags a render behind login/logout
  const links = auth.isAuthenticated ? authLinks : guestLinks;
  const [active, setActive] = useState();

  const items = links.map((link) => (
    <Link
      key={link.label}
      to={link.link}
      className="decoration-0 text-black hover:scale-110 delay-100 duration-150 mx-4 active:font-bold"
      data-active={active === link.link || undefined}
      active={active === link.link || undefined}
      onClick={(event) => {
        setActive(link.link);
      }}
    >
      <Text tt="uppercase">{link.label}</Text>
    </Link>
  ));

  return (
    <AppShell.Header p="sm">
      <Container size="md" className="flex flex-row gap-3">
        <Link to="/">
          <Title order={3} className="text-black">
            PORTAL UMKM
          </Title>
        </Link>
        <Group gap={5} visibleFrom="xs" className="ml-4 items-end">
          {items}
        </Group>

        <Burger
          opened={opened}
          onClick={toggle}
          hiddenFrom="xs"
          className="ml-auto"
          size="sm"
          aria-label="Toggle navigation"
        />
      </Container>

      <Drawer
        opened={opened}
        onClose={close}
        size="100%"
        padding="md"
        title="PORTAL UMKM"
        hiddenFrom="xs"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px" mx="-md">
          <Divider my="sm" />
          <div className="ml-2 flex flex-col gap-3">{items}</div>
        </ScrollArea>
      </Drawer>
    </AppShell.Header>
  );
}

const DefaultMenu = () => {
  return (
    <Menubar>
      <Menubar.Menu>
        <Menubar.Target>Login</Menubar.Target>
      </Menubar.Menu>
    </Menubar>
  );
};
