import { ChannelActionDialog } from './channel-action-dialog'
import { ChannelViewDialog } from './channel-view-dialog'
import { ChannelDeleteDialog } from './channel-delete-dialog'

export function ChannelsDialogs() {
  return (
    <>
      <ChannelActionDialog />
      <ChannelViewDialog />
      <ChannelDeleteDialog />
    </>
  )
}
