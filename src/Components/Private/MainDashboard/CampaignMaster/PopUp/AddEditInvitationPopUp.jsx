// INVITATION CAMPAIGN — create / edit one invitation template.
// Heading + Initial Message + optional image + up to 3 buttons,
// each button with its own auto-reply message.
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import {
  createInvitationTemplate,
  updateInvitationTemplate,
  submitInvitationTemplate,
  uploadInvitationImage,
} from "../../../../../hooks/useInvitationCampaign";

const emptyForm = {
  title: "",
  heading: "",
  bodyText: "",
  category: "MARKETING",
  language: "en",
  image: { mediaId: null, headerHandle: null },
  buttons: [
    { text: "I have registered", replyMessage: "" },
    { text: "I want to register", replyMessage: "" },
  ],
};

const AddEditInvitationPopUp = ({ handleClose, template, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (template) {
      setForm({
        title: template.title || "",
        heading: template.heading || "",
        bodyText: template.bodyText || "",
        category: template.category || "MARKETING",
        language: template.language || "en",
        image: { mediaId: template.image?.mediaId || null, headerHandle: template.image?.headerHandle || null },
        buttons: (template.buttons || []).map((b) => ({ text: b.text, replyMessage: b.replyMessage })),
      });
    } else {
      setForm(emptyForm);
    }
    setImagePreview(null);
  }, [template]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // ── image ──
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) return toast.error("Only JPG or PNG images are allowed.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB.");
    setUploading(true);
    const data = await uploadInvitationImage(file);
    setUploading(false);
    if (data?.success) {
      set("image", { mediaId: data.mediaId, headerHandle: data.headerHandle });
      setImagePreview(URL.createObjectURL(file));
      toast.success("Image uploaded — it will appear at the top of the invitation");
    } else {
      toast.error(data?.error || "Failed to upload image");
    }
  };
  const removeImage = () => {
    set("image", { mediaId: null, headerHandle: null });
    setImagePreview(null);
  };

  // ── buttons ──
  const addButton = () => {
    if (form.buttons.length >= 3) return;
    set("buttons", [...form.buttons, { text: "", replyMessage: "" }]);
  };
  const updateButton = (i, field, value) =>
    set("buttons", form.buttons.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  const removeButton = (i) => set("buttons", form.buttons.filter((_, idx) => idx !== i));

  const validate = () => {
    if (!form.title.trim()) return "Invitation name is required.";
    if (!form.bodyText.trim()) return "Initial Message is required.";
    for (const b of form.buttons) {
      if (!b.text.trim()) return "Every button needs a label.";
      if (!b.replyMessage.trim()) return `Button "${b.text}" needs a reply message.`;
    }
    return null;
  };

  const handleSave = async (andSubmit) => {
    const err = validate();
    if (err) return toast.error(err);

    setSaving(true);
    try {
      toast.loading(andSubmit ? "Saving & submitting to Meta..." : "Saving draft...");
      const data = template
        ? await updateInvitationTemplate(template._id, form)
        : await createInvitationTemplate(form);
      toast.dismiss();

      if (!data?.success) {
        toast.error(data?.error || "Failed to save invitation");
        return;
      }

      let finalTemplate = data.template;
      if (andSubmit) {
        const sub = await submitInvitationTemplate(data.template._id);
        if (sub?.success) {
          toast.success(sub.message);
          finalTemplate = sub.template;
        } else {
          toast.error(sub?.error || "Saved as draft, but Meta submission failed");
        }
      } else {
        toast.success(data.message);
      }
      onSaved(finalTemplate);
    } catch (e) {
      toast.dismiss();
      toast.error("Error saving invitation");
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.title.trim() && form.bodyText.trim();

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1060 }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa-solid fa-envelope-open-text me-2" style={{ color: "#25D366" }}></i>
              {template ? "Edit" : "New"} Invitation
            </h5>
            <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            <div className="row">
              {/* ── Form ── */}
              <div className="col-12 col-lg-7">
                <div className="mb-3">
                  <label className="form-label label_text">Invitation Name <RequiredStar /></label>
                  <input
                    type="text"
                    className="form-control rounded-0"
                    maxLength={100}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Tech Meet Pune 2026"
                  />
                  <small className="text-muted">Only for you — customers don't see this.</small>
                </div>

                <div className="mb-3">
                  <label className="form-label label_text">Heading</label>
                  <input
                    type="text"
                    className="form-control rounded-0"
                    maxLength={60}
                    value={form.heading}
                    onChange={(e) => set("heading", e.target.value)}
                    placeholder="e.g. You're invited: DAccess Tech Meet 2026"
                  />
                  <small className="text-muted">Shown in bold at the top of the message.</small>
                </div>

                <div className="mb-3">
                  <label className="form-label label_text">Initial Message (sent first) <RequiredStar /></label>
                  <textarea
                    className="textarea_edit col-12"
                    rows={7}
                    maxLength={900}
                    value={form.bodyText}
                    onChange={(e) => set("bodyText", e.target.value)}
                    placeholder={"e.g.\nDear Customer,\nWe're delighted to invite you to our Tech Meet on 23rd Oct, 11 AM at Hotel XYZ, Pune.\n\nPlease tap a button below 👇"}
                  />
                  <small className="text-muted">{form.bodyText.length}/900 · This text needs Meta approval.</small>
                </div>

                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label label_text">Category</label>
                    <select className="form-select rounded-0" value={form.category} onChange={(e) => set("category", e.target.value)}>
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                    </select>
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label label_text">Language</label>
                    <select className="form-select rounded-0" value={form.language} onChange={(e) => set("language", e.target.value)}>
                      <option value="en">English</option>
                      <option value="en_US">English (US)</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </div>
                </div>

                {/* ── Image ── */}
                <div className="mb-3">
                  <label className="form-label label_text">Invitation Image <span className="text-muted fw-normal">(optional, JPG/PNG)</span></label>
                  {form.image.mediaId ? (
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-success"><i className="fa-solid fa-image me-1"></i>Image attached</span>
                      <button type="button" className="btn btn-sm btn-outline-danger py-0" onClick={removeImage}>
                        <i className="fa-solid fa-xmark me-1"></i>Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept="image/jpeg,image/png" id="invitationImageUpload" style={{ display: "none" }} onChange={handleImageSelect} disabled={uploading} />
                      <label htmlFor="invitationImageUpload" className={`btn btn-sm btn-outline-secondary ${uploading ? "disabled" : ""}`}>
                        <i className="fa-solid fa-upload me-1"></i>{uploading ? "Uploading..." : "Upload image"}
                      </label>
                    </div>
                  )}
                  <small className="text-muted d-block">Sent at the top of the invitation. Changing it needs Meta re-approval.</small>
                </div>

                {/* ── Buttons ── */}
                <div className="border rounded p-3 mb-3" style={{ backgroundColor: "#f0fdf4", borderColor: "#86efac" }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0" style={{ color: "#166534" }}>
                      <i className="fa-solid fa-hand-pointer me-2"></i>Buttons &amp; Auto-Replies <span className="text-muted fw-normal">(max 3)</span>
                    </h6>
                    {form.buttons.length < 3 && (
                      <button type="button" className="btn btn-sm btn-success" onClick={addButton}>
                        <i className="fa-solid fa-plus me-1"></i>Add button
                      </button>
                    )}
                  </div>
                  <small className="text-muted d-block mb-2">
                    When the customer taps a button, its reply is sent automatically. Links in the reply are clickable.
                    Editing a reply does <strong>not</strong> need Meta re-approval; editing a button label does.
                  </small>

                  {form.buttons.map((b, i) => (
                    <div key={i} className="bg-white border rounded p-2 mb-2">
                      <div className="d-flex gap-2 mb-2">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          maxLength={25}
                          value={b.text}
                          onChange={(e) => updateButton(i, "text", e.target.value)}
                          placeholder="Button label, e.g. I want to register"
                        />
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeButton(i)} title="Remove button">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                      <textarea
                        className="form-control form-control-sm"
                        rows={5}
                        maxLength={4096}
                        value={b.replyMessage}
                        onChange={(e) => updateButton(i, "replyMessage", e.target.value)}
                        placeholder={"Reply sent when this button is tapped, e.g.\nGreat, we'd love to have you with us! 🎉\nRegister here 👇\nhttps://your-link"}
                      />
                    </div>
                  ))}
                  {form.buttons.length === 0 && <div className="text-muted text-center small py-2">No buttons — customers can only read the invitation.</div>}
                </div>
              </div>

              {/* ── Live preview ── */}
              <div className="col-12 col-lg-5">
                <label className="form-label label_text">Preview</label>
                <div className="rounded p-3" style={{ background: "#e5ddd5", minHeight: 300 }}>
                  <div className="bg-white rounded shadow-sm p-2" style={{ maxWidth: 320, fontSize: 14 }}>
                    {(imagePreview || form.image.mediaId) && (
                      imagePreview
                        ? <img src={imagePreview} alt="" className="w-100 rounded mb-2" style={{ maxHeight: 180, objectFit: "cover" }} />
                        : <div className="rounded mb-2 d-flex align-items-center justify-content-center text-muted" style={{ height: 120, background: "#f1f5f9" }}><i className="fa-solid fa-image me-2"></i>Image</div>
                    )}
                    {form.heading.trim() && <div className="fw-bold mb-2">{form.heading}</div>}
                    <div style={{ whiteSpace: "pre-wrap" }}>{form.bodyText || <span className="text-muted">Your message…</span>}</div>
                    {form.buttons.filter((b) => b.text.trim()).map((b, i) => (
                      <div key={i} className="text-center border-top mt-2 pt-2" style={{ color: "#00a5f4" }}>
                        <i className="fa-solid fa-reply me-1"></i>{b.text}
                      </div>
                    ))}
                  </div>
                  {form.buttons.filter((b) => b.text.trim() && b.replyMessage.trim()).map((b, i) => (
                    <div key={i} className="mt-3">
                      <small className="text-muted">If tapped “{b.text}”:</small>
                      <div className="bg-white rounded shadow-sm p-2 mt-1" style={{ maxWidth: 320, fontSize: 13, whiteSpace: "pre-wrap" }}>{b.replyMessage}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-12 pt-3">
                <button type="button" disabled={saving || uploading || !isValid} onClick={() => handleSave(true)} className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                  {saving ? "Saving..." : "Save & Submit to Meta"}
                </button>
                <button type="button" disabled={saving || uploading || !isValid} onClick={() => handleSave(false)} className="w-80 btn btn-outline-secondary rounded-0 m-2 px-4">
                  Save as Draft
                </button>
                <button type="button" onClick={handleClose} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditInvitationPopUp;