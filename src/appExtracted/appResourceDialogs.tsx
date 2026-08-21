// @ts-nocheck
import { memo } from "react";
import { areViewSectionPropsEqual } from "./appViewRenderBoundary";

export const AppResourceDialogs = memo(function AppResourceDialogs({ scope }) {
  const __appScope = scope;
  const {
    AllNetworkTopologyDialog, ICON_LIBRARY_PAGE_SIZE, Trash2, WindowCloseButton, activeImageFolderId, applyExistingImage, applyIconLibraryCatalogIcon, clearSelectedImage,
    createImageFolder, deleteImageAssetFromContextMenu, deleteImageFolder, filteredImageAssetList, iconLibraryCatalog, iconLibraryCategoryOptions, iconLibraryLibraries, iconLibraryLoadedText,
    iconLibraryPicker, iconLibrarySelectedLibraryId, iconLibraryVisibleResult, imageAssetContextMenu, imageAssetList, imageAssets, imageFolders, imageInputRef,
    imagePickerActiveCategoryFilter, imagePickerActiveLibraryTab, imagePickerActiveSourceFilter, imagePickerAssetIsBuiltinIcon, imagePickerAssetNoun, imagePickerCanClear, imagePickerCategoryOptions, imagePickerDialogClassName,
    imagePickerHint, imagePickerRendersCatalogSource, imagePickerSearchQuery, imagePickerShowsLibraryActions, imagePickerSourceLocked, imagePickerTitle, imagePickerUsesIconSources, imagePickerUsesSeparateLibraryTabs,
    imageTarget, isBrowseMode, renameImageFolder, renderNodeDoubleClickDialog, setActiveImageFolderId, setIconLibraryPicker, setImageAssetContextMenu, setImagePickerCategoryFilter,
    setImagePickerSearchQuery, setImagePickerSourceFilter, setImageTarget, sourceFilteredImageAssetList
  } = scope;
  return (<>
{renderNodeDoubleClickDialog()}
      {imageTarget && (<div className="image-picker-backdrop" onPointerDown={() => {
          setImageAssetContextMenu(null);
          setImagePickerSourceFilter("");
          setImagePickerCategoryFilter("");
          setImagePickerSearchQuery("");
          setImageTarget(null);
        }}>
          <section className={`${imagePickerDialogClassName} window-close-host`} onPointerDown={(event) => {
            setImageAssetContextMenu(null);
            event.stopPropagation();
          }}>
            <WindowCloseButton label="关闭资源选择窗口" onClick={() => {
              setImageAssetContextMenu(null);
              setImagePickerSourceFilter("");
              setImagePickerCategoryFilter("");
              setImagePickerSearchQuery("");
              setImageTarget(null);
            }} />
            <div className="image-picker-title">
              <div>
                <h2>{imagePickerTitle}</h2>
                <p>{imagePickerHint}</p>
              </div>
            </div>
            {imagePickerUsesSeparateLibraryTabs && (
              <div className="image-picker-source-tabs" role="tablist" aria-label="资源类型">
                <button
                  type="button"
                  role="tab"
                  aria-selected={imagePickerActiveLibraryTab === "image"}
                  className={imagePickerActiveLibraryTab === "image" ? "active" : ""}
                  onClick={() => {
                    setImageAssetContextMenu(null);
                    setImagePickerSourceFilter("");
                    setImagePickerCategoryFilter("");
                    setImagePickerSearchQuery("");
                  }}
                >
                  图片(含SVG)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={imagePickerActiveLibraryTab === "icon"}
                  className={imagePickerActiveLibraryTab === "icon" ? "active" : ""}
                  onClick={() => {
                    setImageAssetContextMenu(null);
                    setImagePickerSourceFilter("icon-library");
                    setImagePickerCategoryFilter("");
                    setImagePickerSearchQuery("");
                    setIconLibraryPicker((current: any) => ({
                      ...current,
                      selectedCategoryKey: "",
                      searchQuery: "",
                      visibleCount: ICON_LIBRARY_PAGE_SIZE
                    }));
                  }}
                >
                  图标
                </button>
              </div>
            )}
            {imagePickerShowsLibraryActions && (
              <div className="image-picker-actions">
                <select value={activeImageFolderId} onChange={(event) => setActiveImageFolderId(event.target.value)}>
                  {imageFolders.map((folder) => (<option key={folder.id} value={folder.id}>
                      {folder.name}{typeof folder.imageCount === "number" ? ` (${folder.imageCount})` : ""}
                    </option>))}
                </select>
                <button onClick={createImageFolder} disabled={isBrowseMode}>新建文件夹</button>
                <button onClick={renameImageFolder} disabled={isBrowseMode || activeImageFolderId === "root"}>重命名</button>
                <button onClick={deleteImageFolder} disabled={isBrowseMode || activeImageFolderId === "root"}>删除文件夹</button>
                <button onClick={() => {
                  setImagePickerSourceFilter("external");
                  imageInputRef.current?.click();
                }} disabled={isBrowseMode}>导入外部 SVG/PNG</button>
                <button onClick={() => {
                  setImagePickerSourceFilter("external");
                  __appScope.imageArchiveInputRef.current?.click();
                }} disabled={isBrowseMode}>导入文档图片/图标</button>
                {imagePickerCanClear && <button onClick={clearSelectedImage} disabled={isBrowseMode}>取消当前图片</button>}
              </div>
            )}
            {imagePickerRendersCatalogSource ? (
              <div className="icon-library-browser">
                <div className="image-picker-filters icon-library-browser-filters" role="search" aria-label="分类图标筛选检索">
                  <label>
                    图库
                    <select
                      value={iconLibrarySelectedLibraryId}
                      onChange={(event) => {
                        const nextLibraryId = event.target.value;
                        setIconLibraryPicker((current: any) => ({
                          ...current,
                          selectedLibraryId: nextLibraryId,
                          selectedCategoryKey: "",
                          visibleCount: ICON_LIBRARY_PAGE_SIZE
                        }));
                      }}
                      disabled={!iconLibraryCatalog}
                    >
                      <option value="">全部图库</option>
                      <option value="builtin-svg">内置SVG</option>
                      {iconLibraryLibraries.map((library: any) => (
                        <option key={library.id} value={library.id}>
                          {library.label}{typeof library.totalIcons === "number" ? ` (${library.totalIcons})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    分类
                    <select
                      value={iconLibraryPicker?.selectedCategoryKey ?? ""}
                      onChange={(event) => {
                        setIconLibraryPicker((current: any) => ({
                          ...current,
                          selectedCategoryKey: event.target.value,
                          visibleCount: ICON_LIBRARY_PAGE_SIZE
                        }));
                      }}
                      disabled={!iconLibraryCatalog}
                    >
                      <option value="">全部分类</option>
                      {iconLibraryCategoryOptions.map((category: any) => (
                        <option key={category.key} value={category.key}>
                          {category.label}{typeof category.count === "number" ? ` (${category.count})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    检索
                    <input
                      type="search"
                      value={iconLibraryPicker?.searchQuery ?? ""}
                      placeholder="搜索名称/标签/来源"
                      onChange={(event) => {
                        const nextQuery = event.target.value;
                        setIconLibraryPicker((current: any) => ({
                          ...current,
                          searchQuery: nextQuery,
                          visibleCount: ICON_LIBRARY_PAGE_SIZE
                        }));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIconLibraryPicker((current: any) => ({
                        ...current,
                        selectedLibraryId: current.catalog?.libraries?.[0]?.id ?? "",
                        selectedCategoryKey: "",
                        searchQuery: "",
                        visibleCount: ICON_LIBRARY_PAGE_SIZE
                      }));
                    }}
                    disabled={!iconLibrarySelectedLibraryId && !(iconLibraryPicker?.selectedCategoryKey) && !(iconLibraryPicker?.searchQuery)}
                  >
                    清空
                  </button>
                  <span>{iconLibraryLoadedText}</span>
                </div>
                {iconLibrarySelectedLibraryId === "builtin-svg" ? (
                  (() => {
                    const builtinIcons = (imageAssetList ?? []).filter(imagePickerAssetIsBuiltinIcon);
                    const query = (iconLibraryPicker?.searchQuery ?? "").toLowerCase();
                    const filtered = query
                      ? builtinIcons.filter((asset: any) => {
                          const name = String(asset?.name ?? "").toLowerCase();
                          return name.includes(query);
                        })
                      : builtinIcons;
                    if (filtered.length === 0) {
                      return <p className="image-empty">{query ? "没有匹配的内置SVG图标。" : "没有内置SVG图标。"}</p>;
                    }
                    return (
                      <div className="image-asset-list icon-library-catalog-list">
                        {filtered.map((asset: any, index: number) => (
                          <button
                            key={asset.id || index}
                            className="image-asset-option icon-library-catalog-option"
                            disabled={isBrowseMode}
                            onClick={() => applyExistingImage(asset.id)}
                            title={asset.name || `内置图标 ${index + 1}`}
                          >
                            <img src={asset.url} alt={asset.name || `内置图标 ${index + 1}`} loading="lazy"/>
                            <span>{asset.name || `内置图标 ${index + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()
                ) : iconLibraryPicker?.status === "error" ? (
                  <p className="image-empty">{iconLibraryPicker.error || "读取分类图标库失败。"}</p>
                ) : !iconLibraryCatalog ? (
                  <p className="image-empty">正在加载分类图标库目录...</p>
                ) : iconLibraryPicker?.status === "loading" && iconLibraryVisibleResult.visible.length === 0 ? (
                  <p className="image-empty">正在按需加载图标清单...</p>
                ) : iconLibraryVisibleResult.visible.length === 0 ? (
                  <p className="image-empty">没有匹配的分类图标，请调整图库、分类或搜索关键字。</p>
                ) : (
                  <>
                    <div className="image-asset-list icon-library-catalog-list">
                      {iconLibraryVisibleResult.visible.map((icon: any, index: number) => (
                        <button
                          key={icon.id}
                          className="image-asset-option icon-library-catalog-option"
                          disabled={isBrowseMode}
                          onClick={() => applyIconLibraryCatalogIcon(icon.id)}
                          title={`${icon.libraryLabel} / ${icon.categoryLabel} / ${icon.name}`}
                        >
                          <img src={icon.url} alt={icon.name || `分类图标 ${index + 1}`} loading="lazy"/>
                          <span>{icon.name || `分类图标 ${index + 1}`}</span>
                          <small>{icon.categoryLabel}</small>
                        </button>
                      ))}
                    </div>
                    <div className="icon-library-load-more">
                      <span>
                        已显示 {iconLibraryVisibleResult.visible.length} / {iconLibraryVisibleResult.total}
                        {iconLibraryPicker?.status === "loading" ? "，正在加载..." : ""}
                      </span>
                      {iconLibraryVisibleResult.hasMore && (
                        <button
                          type="button"
                          onClick={() => {
                            setIconLibraryPicker((current: any) => ({
                              ...current,
                              visibleCount: (current.visibleCount || ICON_LIBRARY_PAGE_SIZE) + ICON_LIBRARY_PAGE_SIZE
                            }));
                          }}
                        >
                          加载更多
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : imageAssetList.length > 0 && (
              <div className={`image-picker-filters ${imagePickerSourceLocked ? "source-locked" : ""}`} role="search" aria-label={`${imagePickerAssetNoun}筛选检索`}>
                {!imagePickerSourceLocked && imagePickerUsesIconSources && (
                    <label>
                      来源
                      <select value={imagePickerActiveSourceFilter} onChange={(event) => {
                        const nextSource = event.target.value;
                        setImagePickerSourceFilter(nextSource);
                        setImagePickerCategoryFilter("");
                        // 切换到开源SVG综合图标库时，重置分页为默认值
                        if (nextSource === "catalog") {
                          setIconLibraryPicker((current: any) => ({
                            ...current,
                            visibleCount: ICON_LIBRARY_PAGE_SIZE
                          }));
                        }
                      }}>
                        <option value="builtin">内置 SVG</option>
                        <option value="catalog">开源SVG综合图标库</option>
                        <option value="external">外部导入</option>
                      </select>
                    </label>
                  )}
                <label>
                  分类
                  <select value={imagePickerActiveCategoryFilter} onChange={(event) => setImagePickerCategoryFilter(event.target.value)}>
                    <option value="">全部分类</option>
                    {imagePickerCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                {!imagePickerSourceLocked && (
                  <>
                    <label>
                      检索
                      <input
                        type="search"
                        value={imagePickerSearchQuery}
                        placeholder="搜索名称/文件名/分类"
                        onChange={(event) => setImagePickerSearchQuery(event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePickerSourceFilter("");
                        setImagePickerCategoryFilter("");
                        setImagePickerSearchQuery("");
                      }}
                      disabled={(!imagePickerUsesIconSources || imagePickerActiveSourceFilter === "builtin") && !imagePickerActiveCategoryFilter && !imagePickerSearchQuery}
                    >
                      清空
                    </button>
                  </>
                )}
                <span>{filteredImageAssetList.length} / {sourceFilteredImageAssetList.length}</span>
              </div>
            )}
            {!imagePickerRendersCatalogSource && (<div className="image-asset-list">
              {imageAssetList.length === 0 || (imagePickerUsesSeparateLibraryTabs && imagePickerActiveLibraryTab === "image" && sourceFilteredImageAssetList.length === 0) ? (<p className="image-empty">后台暂无图片，请先加载本地图片。</p>) : sourceFilteredImageAssetList.length === 0 ? (<p className="image-empty">{imagePickerUsesIconSources && imagePickerActiveSourceFilter === "external" ? "暂无外部导入图标，请使用上方外部导入按钮。" : `暂无可用${imagePickerAssetNoun}。`}</p>) : filteredImageAssetList.length === 0 ? (<p className="image-empty">{`没有匹配的${imagePickerAssetNoun}，请调整来源、分类或搜索关键字。`}</p>) : (filteredImageAssetList.map((asset, index) => {
                const canDeleteImageAsset = !isBrowseMode && !imagePickerAssetIsBuiltinIcon(asset) && (!imagePickerUsesIconSources || imagePickerActiveSourceFilter === "external");
                return (<button key={asset.id} className="image-asset-option" disabled={isBrowseMode} onClick={() => {
                    setImageAssetContextMenu(null);
                    applyExistingImage(asset.id);
                  }} onContextMenu={(event) => {
                    if (!canDeleteImageAsset) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setImageAssetContextMenu({
                      assetId: asset.id,
                      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 148)),
                      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 52))
                    });
                  }} title={asset.name || asset.filename || `后台图片 ${index + 1}`}>
                    <img src={imageAssets[asset.id] ?? asset.url} alt={asset.name || `后台图片 ${index + 1}`}/>
                    <span>{asset.name || `后台图片 ${index + 1}`}</span>
                </button>);
              }))}
            </div>)}
            {!imagePickerRendersCatalogSource && imageAssetContextMenu && (
              <div
                className="context-menu image-asset-context-menu"
                role="menu"
                style={{ left: imageAssetContextMenu.x, top: imageAssetContextMenu.y }}
                onPointerDown={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
              >
                <button type="button" role="menuitem" onClick={deleteImageAssetFromContextMenu} disabled={isBrowseMode}>
                  <Trash2 size={14} aria-hidden="true"/>
                  删除
                </button>
              </div>
            )}
          </section>
        </div>)}
      <AllNetworkTopologyDialog scope={__appScope} />
  </>);
}, areViewSectionPropsEqual);
