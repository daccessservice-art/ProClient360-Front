import { useState, useEffect } from "react";
import validator from "validator";
import { updateProduct } from "../../../../../hooks/useProduct";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { toast } from "react-hot-toast";

const UpdateProductPopUp = ({ handleUpdate, selectedProduct, categories = [] }) => {
  const [product, setProduct] = useState(selectedProduct);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  
  // State for brands and categories
  const [allBrands, setAllBrands] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // Base UOM options
  const uomOptions = ["bags", "litre", "brass", "kilogram", "gram", "meter", "piece", "box", "carton", "nos"];
  
  // Category options - these must match the enum values in the schema
  const categoryOptions = [
    { value: "raw material", label: "Raw Material" },
    { value: "finish material", label: "Finish Material" },
    { value: "finished goods", label: "Finished Goods" },
    { value: "scrap", label: "Scrap" },
    { value: "repairing material", label: "Repairing Material" },
    { value: "work in progress", label: "Work in Progress" }
  ];

  // Initialize brands and categories from localStorage or defaults
  useEffect(() => {
    // Load brands from localStorage or use defaults
    const savedBrands = localStorage.getItem('productBrands');
    if (savedBrands) {
      setAllBrands(JSON.parse(savedBrands));
    } else {
      setAllBrands(["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"]);
    }

    // Load categories from localStorage or use props/defaults
    const savedCategories = localStorage.getItem('productCategories');
    if (savedCategories) {
      setAllCategories(JSON.parse(savedCategories));
    } else if (categories.length > 0) {
      setAllCategories(categories);
    } else {
      setAllCategories(["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"]);
    }
  }, [categories]);

  // Save brands to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('productBrands', JSON.stringify(allBrands));
  }, [allBrands]);

  // Save categories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('productCategories', JSON.stringify(allCategories));
  }, [allCategories]);

  useEffect(() => {
    if (selectedProduct) {
      setProduct(selectedProduct);
    }
  }, [selectedProduct]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProduct((prevProduct) => ({
      ...prevProduct,
      [name]: value,
    }))
  };

  const handleProductUpdate = async (e) => {
    e.preventDefault();
    
    // Validate that category is selected
    if (!product.category) {
      toast.error("Please select a Category");
      return;
    }
    
    // Only validate required fields: productName and baseUOM
    if (!product.productName || !product.baseUOM) {
      toast.error("Product Name and Base UOM are required fields");
      return;
    }
    
    // Validate numeric fields if they are provided
    if (product.mrp && isNaN(product.mrp)) {
      toast.error("MRP must be a valid number");
      return;
    }
    
    if (product.salesPrice && isNaN(product.salesPrice)) {
      toast.error("Sales Price must be a valid number");
      return;
    }
    
    if (product.purchasePrice && isNaN(product.purchasePrice)) {
      toast.error("Purchase Price must be a valid number");
      return;
    }
    
    if (product.minSalesPrice && isNaN(product.minSalesPrice)) {
      toast.error("Min Sales Price must be a valid number");
      return;
    }
    
    if (product.minQtyLevel && isNaN(product.minQtyLevel)) {
      toast.error("Min Qty Level must be a valid number");
      return;
    }
    
    if (product.uomConversion && isNaN(product.uomConversion)) {
      toast.error("UOM Conversion must be a valid number");
      return;
    }
    
    if (parseFloat(product.mrp) < parseFloat(product.salesPrice)) {
      toast.error("MRP must be greater than or equal to sales price");
      return;
    }
    
    if (parseFloat(product.salesPrice) < parseFloat(product.minSalesPrice)) {
      toast.error("Sales price must be greater than or equal to minimum sales price");
      return;
    }
    
    if (product.discountType !== "Zero Discount" && (!product.discountValue || isNaN(product.discountValue))) {
      toast.error("Please enter a valid discount value");
      return;
    }

    try {
      toast.loading("Updating Product.....");
      const data = await updateProduct(product);
      toast.dismiss();
      
      if(data.success) {
        toast.success(data.message);
        handleUpdate();
      } else {
        toast.error(data.error || "Failed to update product");
      }
    } catch(error) {
      toast.error("Error updating product");
      console.error("Update error:", error);
    }
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      // Check if category already exists
      if (allCategories.includes(newCategory.trim())) {
        toast.error("Category already exists");
        return;
      }
      
      // Add the new category to the local state
      const updatedCategories = [...allCategories, newCategory.trim()];
      setAllCategories(updatedCategories);
      
      // Set the product category to the newly added category
      setProduct(prev => ({ ...prev, productCategory: newCategory }));
      
      // Reset the new category input and close the popup
      setNewCategory("");
      setShowAddCategory(false);
      
      toast.success("New category added successfully");
    } else {
      toast.error("Please enter a category name");
    }
  };

  const handleAddNewBrand = () => {
    if (newBrand.trim()) {
      // Check if brand already exists
      if (allBrands.includes(newBrand.trim())) {
        toast.error("Brand already exists");
        return;
      }
      
      // Add the new brand to the local state
      const updatedBrands = [...allBrands, newBrand.trim()];
      setAllBrands(updatedBrands);
      
      // Set the brand name to the newly added brand
      setProduct(prev => ({ ...prev, brandName: newBrand }));
      
      // Reset the new brand input and close the popup
      setNewBrand("");
      setShowAddBrand(false);
      
      toast.success("New brand added successfully");
    } else {
      toast.error("Please enter a brand name");
    }
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#00000090",
        }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleProductUpdate}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Update Product
                </h5>
                <button
                  onClick={() => handleUpdate()}
                  type="button"
                  className="close px-3"
                  style={{ marginLeft: "auto" }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row modal_body_height" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  <div className="col-12">
                    <div className="">
                      <label htmlFor="productName" className="form-label label_text">
                        Product Name <RequiredStar />
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="productName"
                        maxLength={100}
                        name="productName"
                        value={product.productName || ""}
                        onChange={handleChange}
                        aria-describedby="nameHelp"
                        placeholder="Update Product Name.... "
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="brandName" className="form-label label_text">
                        Brand Name
                      </label>
                      <div className="input-group">
                        <select
                          className="form-select rounded-0"
                          id="brandName"
                          name="brandName"
                          value={product.brandName || ""}
                          onChange={handleChange}
                        >
                          <option value="">Select Brand</option>
                          {allBrands.map((brand, index) => (
                            <option key={index} value={brand}>{brand}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowAddBrand(true)}
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="printName" className="form-label label_text">
                        Print Name
                      </label>
                      <input
                        type="text"
                        name="printName"
                        maxLength={100}
                        placeholder="Update Print Name...."
                        className="form-control rounded-0"
                        id="printName"
                        value={product.printName || ""}
                        onChange={handleChange}
                        aria-describedby="emailHelp"
                      />
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="aliasName" className="form-label label_text">
                        Alias Name
                      </label>
                      <input
                        type="text"
                        name="aliasName"
                        maxLength={100}
                        placeholder="Update Alias Name...."
                        className="form-control rounded-0"
                        id="aliasName"
                        value={product.aliasName || ""}
                        onChange={handleChange}
                        aria-describedby="emailHelp"
                      />
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="model" className="form-label label_text">
                        Model
                      </label>
                      <input
                        type="text"
                        name="model"
                        maxLength={100}
                        placeholder="Update Model...."
                        className="form-control rounded-0"
                        id="model"
                        value={product.model || ""}
                        onChange={handleChange}
                        aria-describedby="emailHelp"
                      />
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="hsnCode" className="form-label label_text">
                        HSN Code
                      </label>
                      <input
                        type="text"
                        name="hsnCode"
                        maxLength={8}
                        placeholder="Update HSN Code...."
                        className="form-control rounded-0"
                        id="hsnCode"
                        value={product.hsnCode || ""}
                        onChange={handleChange}
                        aria-describedby="emailHelp"
                      />
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="description" className="form-label label_text">
                        Description
                      </label>
                      <textarea
                        className="form-control rounded-0"
                        id="description"
                        name="description"
                        maxLength={500}
                        value={product.description || ""}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Update Description...."
                      ></textarea>
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="productCategory" className="form-label label_text">
                        Product Category
                      </label>
                      <div className="input-group">
                        <select
                          className="form-select rounded-0"
                          id="productCategory"
                          name="productCategory"
                          value={product.productCategory || ""}
                          onChange={handleChange}
                        >
                          <option value="">Select Product Category</option>
                          {allCategories.map((cat, index) => (
                            <option key={index} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowAddCategory(true)}
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {showAddCategory && (
                    <div className="col-12">
                      <div className="modal fade show" style={{ display: "block", backgroundColor: "#00000050", position: "absolute", zIndex: 9999, width: "100%" }}>
                        <div className="modal-dialog modal-sm">
                          <div className="modal-content">
                            <div className="modal-header">
                              <h5 className="modal-title">Add New Category</h5>
                              <button type="button" className="btn-close" onClick={() => setShowAddCategory(false)}></button>
                            </div>
                            <div className="modal-body">
                              <input
                                type="text"
                                className="form-control"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="Enter new category"
                              />
                            </div>
                            <div className="modal-footer">
                              <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategory(false)}>
                                Cancel
                              </button>
                              <button type="button" className="btn btn-primary" onClick={handleAddNewCategory}>
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showAddBrand && (
                    <div className="col-12">
                      <div className="modal fade show" style={{ display: "block", backgroundColor: "#00000050", position: "absolute", zIndex: 9999, width: "100%" }}>
                        <div className="modal-dialog modal-sm">
                          <div className="modal-content">
                            <div className="modal-header">
                              <h5 className="modal-title">Add New Brand</h5>
                              <button type="button" className="btn-close" onClick={() => setShowAddBrand(false)}></button>
                            </div>
                            <div className="modal-body">
                              <input
                                type="text"
                                className="form-control"
                                value={newBrand}
                                onChange={(e) => setNewBrand(e.target.value)}
                                placeholder="Enter new brand"
                              />
                            </div>
                            <div className="modal-footer">
                              <button type="button" className="btn btn-secondary" onClick={() => setShowAddBrand(false)}>
                                Cancel
                              </button>
                              <button type="button" className="btn btn-primary" onClick={handleAddNewBrand}>
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="baseUOM" className="form-label label_text">
                        Base UOM <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="baseUOM"
                        name="baseUOM"
                        value={product.baseUOM || ""}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Base UOM</option>
                        {uomOptions.map((uom, index) => (
                          <option key={index} value={uom}>{uom}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="alternateUOM" className="form-label label_text">
                        Alternate UOM
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="alternateUOM"
                        name="alternateUOM"
                        value={product.alternateUOM || ""}
                        onChange={handleChange}
                      >
                        <option value="">Select Alternate UOM</option>
                        {uomOptions.map((uom, index) => (
                          <option key={index} value={uom}>{uom}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="uomConversion" className="form-label label_text">
                        UOM Conversion
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="uomConversion"
                        name="uomConversion"
                        value={product.uomConversion || 1}
                        onChange={handleChange}
                        placeholder="Update UOM conversion factor"
                      />
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="category" className="form-label label_text">
                        Product Group <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="category"
                        name="category"
                        value={product.category || ""}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Category</option>
                        {categoryOptions.map((option, index) => (
                          <option key={index} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-12 mt-2">
                    <div className="row border bg-gray mx-auto p-3">
                      <div className="col-10 mb-3">
                        <span className="SecondaryInfo">Rate Details</span>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="mrp" className="form-label label_text">
                            MRP
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="mrp"
                            name="mrp"
                            onChange={handleChange}
                            value={product.mrp || ""}
                            aria-describedby="mobileNoHelp"
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="salesPrice" className="form-label label_text">
                            Sales Price
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="salesPrice"
                            name="salesPrice"
                            onChange={handleChange}
                            value={product.salesPrice || ""}
                            aria-describedby="secemailHelp"
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="purchasePrice" className="form-label label_text">
                            Purchase Price
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="purchasePrice"
                            name="purchasePrice"
                            onChange={handleChange}
                            value={product.purchasePrice || ""}
                            aria-describedby="secemailHelp"
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="minSalesPrice" className="form-label label_text">
                            Min. Sales Price
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="minSalesPrice"
                            name="minSalesPrice"
                            onChange={handleChange}
                            value={product.minSalesPrice || ""}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="minQtyLevel" className="form-label label_text">
                            Min. Qty Level
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="minQtyLevel"
                            name="minQtyLevel"
                            onChange={handleChange}
                            value={product.minQtyLevel || ""}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="discountType" className="form-label label_text">
                            Discount Type
                          </label>
                          <select
                            className="form-select rounded-0"
                            id="discountType"
                            name="discountType"
                            value={product.discountType || "Zero Discount"}
                            onChange={handleChange}
                          >
                            <option value="Zero Discount">Zero Discount</option>
                            <option value="In percentage">In Percentage</option>
                            <option value="In Value">In Value</option>
                          </select>
                        </div>
                      </div>

                      {product.discountType !== "Zero Discount" && (
                        <div className="col-12 col-lg-4 mt-2">
                          <div className="mb-3">
                            <label htmlFor="discountValue" className="form-label label_text">
                              Discount Value
                            </label>
                            <input
                              type="text"
                              className="form-control rounded-0"
                              id="discountValue"
                              name="discountValue"
                              onChange={handleChange}
                              value={product.discountValue || ""}
                              placeholder={product.discountType === "In percentage" ? "Enter percentage" : "Enter value"}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button
                        type="submit"
                        className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdate}
                        className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpdateProductPopUp;