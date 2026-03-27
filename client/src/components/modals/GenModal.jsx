import { useApp } from '../../context/AppContext';

export default function GenModal() {
  const { genModal, setGenModal } = useApp();
  if (!genModal) return null;

  function close() { setGenModal(null); }
  function doAction() {
    if (genModal.cb) genModal.cb();
    close();
  }

  return (
    <div className="modal-ov show" id="genmo" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal-box">
        <div className="mh"></div>
        <div className="mt">{genModal.title}</div>
        <div className="ms" style={{ whiteSpace: 'pre-line' }}>{genModal.sub}</div>
        {genModal.extra && <div dangerouslySetInnerHTML={{ __html: genModal.extra }} />}
        <button className="mbtn g" onClick={doAction}>{genModal.label}</button>
        <button className="mbtn gray" onClick={close}>Отмена</button>
      </div>
    </div>
  );
}
