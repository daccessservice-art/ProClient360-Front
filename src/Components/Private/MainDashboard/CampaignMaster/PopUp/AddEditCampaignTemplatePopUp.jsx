import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import {
  createCampaignTemplate,
  updateCampaignTemplate,
  submitCampaignTemplate,
  uploadCampaignImage,
} from "../../../../../hooks/useCampaign";

const emptyForm = { title: "", category: "MARKETING", language: "en", bodyText: "", buttons: [], questions: [], images: [] };
const emptyQuestion = { questionText: "", options: [{ title: "", description: "" }] };

// template = existing template object to edit, or null to create new
const AddEditCampaignTemplatePopUp = ({ handleClose, template, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setForm({
        title: template.title,
        category: template.category,
        language: template.language,
        bodyText: template.bodyText,
        buttons: (template.buttons || []).map((b) => ({ text: b.text })),
        questions: (template.questions || []).map((q) => ({
          questionText: q.questionText,
          options: (q.options || []).map((o) => ({ title: o.title, description: o.description || "" })),
        })),
        images: (template.images || []).map((img) => ({ mediaId: img.mediaId, caption: img.caption || "" })),
      });
    } else {
      setForm(emptyForm);
    }
  }, [template]);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.images.length >= 5) {
      toast.error("Maximum 5 images per template.");
      e.target.value = "";
      return;
    }
    setUploadingImage(true);
    try {
      const data = await uploadCampaignImage(file);
      if (data?.success) {
        setForm((f) => ({ ...f, images: [...f.images, { mediaId: data.mediaId, caption: "" }] }));
        toast.success("Image uploaded");
      } else {
        toast.error(data?.error || "Failed to upload image");
      }
    } catch (err) {
      toast.error("Error uploading image");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };
  const updateImageCaption = (i, caption) => {
    setForm((f) => ({ ...f, images: f.images.map((img, idx) => (idx === i ? { ...img, caption } : img)) }));
  };
  const removeImage = (i) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  };

  const isValid = form.title.trim() && form.bodyText.trim();

  // ── quick-reply buttons (max 3, on the template itself) ──
  const addButton = () => {
    if (form.buttons.length >= 3) return;
    setForm((f) => ({ ...f, buttons: [...f.buttons, { text: "" }] }));
  };
  const updateButton = (i, text) => {
    setForm((f) => ({ ...f, buttons: f.buttons.map((b, idx) => (idx === i ? { text } : b)) }));
  };
  const removeButton = (i) => {
    setForm((f) => ({ ...f, buttons: f.buttons.filter((_, idx) => idx !== i) }));
  };

  // ── questions (max 10, each with up to 10 tappable options) ──
  const addQuestion = () => {
    if (form.questions.length >= 10) return;
    setForm((f) => ({ ...f, questions: [...f.questions, { ...emptyQuestion, options: [{ title: "", description: "" }] }] }));
  };
  const removeQuestion = (qi) => {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, idx) => idx !== qi) }));
  };
  const updateQuestionText = (qi, questionText) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) => (idx === qi ? { ...q, questionText } : q)),
    }));
  };
  const addOption = (qi) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) =>
        idx === qi
          ? q.options.length >= 10
            ? q
            : { ...q, options: [...q.options, { title: "", description: "" }] }
          : q
      ),
    }));
  };
  const removeOption = (qi, oi) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.filter((_, oidx) => oidx !== oi) } : q
      ),
    }));
  };
  const updateOption = (qi, oi, field, value) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) =>
        idx === qi
          ? { ...q, options: q.options.map((o, oidx) => (oidx === oi ? { ...o, [field]: value } : o)) }
          : q
      ),
    }));
  };

  const validateQuestions = () => {
    for (const q of form.questions) {
      if (!q.questionText.trim()) return "Every question needs text.";
      if (q.options.length === 0) return "Every question needs at least one option.";
      if (q.options.some((o) => !o.title.trim())) return "Every option needs a title.";
    }
    return null;
  };

  const handleSave = async (andSubmit) => {
    if (!isValid) {
      toast.error("Product name and message body are required");
      return;
    }
    const qError = validateQuestions();
    if (qError) {
      toast.error(qError);
      return;
    }

    setSaving(true);
    try {
      toast.loading(andSubmit ? "Saving & submitting to Meta..." : "Saving draft...");
      const data = template
        ? await updateCampaignTemplate(template._id, form)
        : await createCampaignTemplate(form);
      toast.dismiss();

      if (!data.success) {
        toast.error(data.error || "Failed to save template");
        setSaving(false);
        return;
      }

      let finalTemplate = data.template;

      if (andSubmit) {
        const submitResult = await submitCampaignTemplate(data.template._id);
        if (submitResult.success) {
          toast.success(submitResult.message);
          finalTemplate = submitResult.template;
        } else {
          toast.error(submitResult.error || "Saved as draft, but Meta submission failed");
        }
      } else {
        toast.success(data.message);
      }

      onSaved(finalTemplate);
    } catch (error) {
      toast.dismiss();
      toast.error("Error saving template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa-brands fa-whatsapp me-2" style={{ color: "#25D366" }}></i>
              {template ? "Edit" : "Add"} Product Campaign Template
            </h5>
            <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            <div className="row modal_body_height">

              <div className="col-12 mb-3">
                <label className="form-label label_text">Product Name <RequiredStar /></label>
                <input
                  type="text"
                  className="form-control rounded-0"
                  maxLength={100}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Boom Barrier"
                  required
                />
              </div>

              <div className="col-12 col-lg-6 mb-3">
                <label className="form-label label_text">Category</label>
                <select
                  className="form-select rounded-0"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                </select>
              </div>

              <div className="col-12 col-lg-6 mb-3">
                <label className="form-label label_text">Language</label>
                <select
                  className="form-select rounded-0"
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="en_US">English (US)</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              <div className="col-12 mb-3">
                <label className="form-label label_text">Initial Message (sent first) <RequiredStar /></label>
                <textarea
                  className="textarea_edit col-12"
                  rows={8}
                  maxLength={1024}
                  value={form.bodyText}
                  onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
                  placeholder="e.g.&#10;&#10;🚧 Thank you for your interest in Boom Barrier Solutions.&#10;Welcome to DAccess Security Systems.&#10;&#10;Reply to get started and we'll walk you through a few quick questions."
                  required
                />
                <small className="text-muted">
                  This is the outbound template Meta reviews — plain text only, sent once per campaign. Keep it short; put the real questions below instead of listing ☐ options here.
                </small>
              </div>

              <div className="col-12 mb-3">
                <label className="form-label label_text">
                  Quick-Reply Buttons <span className="text-muted fw-normal">(optional, max 3)</span>
                </label>
                {form.buttons.map((b, i) => (
                  <div key={i} className="d-flex gap-2 mb-2">
                    <input
                      type="text"
                      className="form-control"
                      maxLength={20}
                      value={b.text}
                      onChange={(e) => updateButton(i, e.target.value)}
                      placeholder="e.g. CALL ME"
                    />
                    <button type="button" className="btn btn-outline-danger" onClick={() => removeButton(i)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
                {form.buttons.length < 3 && (
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addButton}>
                    + Add button
                  </button>
                )}
              </div>

              {/* ── NEW: Images — sent right after the customer's first reply, before Question 1 ── */}
              <div className="col-12 mb-3">
                <label className="form-label label_text">
                  Images <span className="text-muted fw-normal">(optional, max 5 — sent after the customer's first reply, before questions)</span>
                </label>
                <div className="d-flex flex-wrap gap-3 mb-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="border rounded p-2" style={{ width: 160 }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <i className="fa-solid fa-image text-muted"></i>
                        <button type="button" className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => removeImage(i)}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                      <small className="text-muted d-block mb-1" style={{ fontSize: "10px", wordBreak: "break-all" }}>
                        ID: {img.mediaId}
                      </small>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Caption (optional)"
                        value={img.caption}
                        onChange={(e) => updateImageCaption(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                {form.images.length < 5 && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id="campaignImageUpload"
                      style={{ display: "none" }}
                      onChange={handleImageSelect}
                      disabled={uploadingImage}
                    />
                    <label htmlFor="campaignImageUpload" className={`btn btn-sm btn-outline-secondary ${uploadingImage ? "disabled" : ""}`}>
                      <i className="fa-solid fa-upload me-1"></i>
                      {uploadingImage ? "Uploading..." : "+ Add image"}
                    </label>
                  </div>
                )}
                <small className="text-muted d-block mt-1">
                  Images are session content — adding or removing them never requires Meta re-approval.
                </small>
              </div>

              {/* ── NEW: Questions builder — the real tappable questionnaire ── */}
              <div className="col-12 mt-2">
                <div className="row border rounded p-3 mx-0" style={{ backgroundColor: "#eff6ff", borderColor: "#93c5fd" }}>
                  <div className="col-12 mb-2 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0" style={{ color: "#1e40af" }}>
                      <i className="fa-solid fa-list-check me-2"></i>
                      Tappable Questions <span className="text-muted fw-normal">(optional, max 10)</span>
                    </h6>
                    {form.questions.length < 10 && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={addQuestion}>
                        <i className="fa-solid fa-plus me-1"></i>Add Question
                      </button>
                    )}
                  </div>

                  <div className="col-12 mb-3">
                    <small className="text-muted">
                      <i className="fa-solid fa-circle-info me-1"></i>
                      These are sent as real tappable lists (like your Boom Barrier "Application type", "Gates", etc.) — but WhatsApp only allows this{" "}
                      <strong>after the customer replies to the initial message</strong>, not in the first send. Once they reply, Question 1 is sent automatically, then Question 2 after they tap, and so on.
                    </small>
                  </div>

                  {form.questions.length === 0 && (
                    <div className="col-12 text-center text-muted py-3">
                      No questions yet — customers will only see the initial message above and reply by typing.
                    </div>
                  )}

                  {form.questions.map((q, qi) => (
                    <div key={qi} className="col-12 mb-3 p-2 border rounded bg-white">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong style={{ fontSize: "0.9rem" }}>Question {qi + 1}</strong>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeQuestion(qi)}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-control mb-2"
                        maxLength={1024}
                        placeholder="e.g. What type of application is this for?"
                        value={q.questionText}
                        onChange={(e) => updateQuestionText(qi, e.target.value)}
                      />

                      <label className="form-label small fw-bold mb-1">
                        Tappable Options <span className="text-muted fw-normal">(max 10, title max 24 chars)</span>
                      </label>
                      {q.options.map((o, oi) => (
                        <div key={oi} className="d-flex gap-2 mb-1">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            maxLength={24}
                            placeholder="Option title, e.g. Corporate"
                            value={o.title}
                            onChange={(e) => updateOption(qi, oi, "title", e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            maxLength={72}
                            placeholder="Optional description"
                            value={o.description}
                            onChange={(e) => updateOption(qi, oi, "description", e.target.value)}
                          />
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeOption(qi, oi)}>
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ))}
                      {q.options.length < 10 && (
                        <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={() => addOption(qi)}>
                          + Add option
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-12 pt-3 mt-2">
                <button
                  type="button"
                  disabled={saving || !isValid}
                  onClick={() => handleSave(true)}
                  className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                >
                  {saving ? "Saving..." : "Save & Submit to Meta"}
                </button>
                <button
                  type="button"
                  disabled={saving || !isValid}
                  onClick={() => handleSave(false)}
                  className="w-80 btn btn-outline-secondary rounded-0 m-2 px-4"
                >
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

export default AddEditCampaignTemplatePopUp;