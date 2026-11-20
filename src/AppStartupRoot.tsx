import { useEffect, useState } from "react";
import { Alert, Button, Form, Input, Modal } from "antd";
import { App } from "./App";
import { runStartupGate } from "./appStartup";
import { currentQiankunUser } from "./qiankunUserSpace";
import { initializeDefaultSpace, writeSpaceCookie } from "./spaceClient";
import { finishBoot } from "./startupProgress";
import { resetInitialWorkspaceUrlIntent, syncWorkspaceUrl } from "./workspaceUrl";

export function AppStartupRoot({ needsInitialSpace }: { needsInitialSpace: boolean }) {
  const [setupRequired, setSetupRequired] = useState(needsInitialSpace);
  const [name, setName] = useState("默认空间");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (needsInitialSpace) finishBoot();
  }, [needsInitialSpace]);

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const owner = currentQiankunUser();
      await initializeDefaultSpace(trimmedName, owner || undefined);
      writeSpaceCookie("default");
      syncWorkspaceUrl({ spaceId: "default" });
      resetInitialWorkspaceUrlIntent();

      if (await runStartupGate({ skipUrlAdoption: true })) {
        throw new Error("默认空间尚未完成初始化，请重试。");
      }
      setSetupRequired(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!setupRequired) return <App />;

  return (
    <Modal
      title="创建默认空间"
      open
      closable={false}
      keyboard={false}
      maskClosable={false}
      footer={null}
      destroyOnHidden
    >
      <Form layout="vertical" onFinish={() => void submit()}>
        <Form.Item label="空间名称" required>
          <Input
            id="initial-space-name"
            autoFocus
            autoComplete="off"
            value={name}
            disabled={submitting}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        </Form.Item>
        {error ? <Alert className="space-bootstrap-error" type="error" showIcon role="alert" message={error} /> : null}
        <Button type="primary" htmlType="submit" block loading={submitting} disabled={!name.trim()}>
          创建空间
        </Button>
      </Form>
    </Modal>
  );
}
