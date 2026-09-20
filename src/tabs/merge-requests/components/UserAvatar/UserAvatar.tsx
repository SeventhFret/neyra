import { Avatar, type AvatarProps, Tooltip } from "@mantine/core";

import type { ProviderUser } from "../../../../stores/mergeRequests/store.types";

type UserAvatarProps = Omit<AvatarProps, "src" | "name"> & {
  user: ProviderUser;
  tooltip?: boolean;
};

export default function UserAvatar({
  user,
  tooltip = true,
  ...props
}: UserAvatarProps) {
  const name = user.displayName?.trim() || user.username;

  const avatar = (
    <Avatar
      {...props}
      src={user.avatarUrl || undefined}
      name={name}
      alt={name}
    />
  );

  if (!tooltip) {
    return avatar;
  }

  return (
    <Tooltip
      label={
        user.displayName
          ? `${user.displayName} (@${user.username})`
          : `@${user.username}`
      }
      withArrow
    >
      {avatar}
    </Tooltip>
  );
}
