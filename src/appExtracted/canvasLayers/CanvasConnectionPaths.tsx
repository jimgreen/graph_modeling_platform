/**
 * CanvasConnectionPaths - 连接线点击热区路径与可见路径双层组件
 *
 * 独立存放以便主体图元层与顶层覆盖层共享，避免循环导入。
 */
export function CanvasConnectionPaths({
  d,
  onContextMenu,
  onDoubleClick,
  onPointerDown
}: {
  d: string;
  onContextMenu?: (event: any) => void;
  onDoubleClick?: (event: any) => void;
  onPointerDown?: (event: any) => void;
}) {
  return (
    <>
      <path
        d={d}
        className="connection-hitline"
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
      />
      <path d={d} className="connection-line" />
    </>
  );
}
