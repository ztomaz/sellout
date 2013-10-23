/* bill functions */
function get_bill(){
    // get the active bill for the current user
    get_data(window.data.get_bill_url, render_bill);
}

function product_to_item(product){
    // create a bill item from product
    item = {
        bill_id:window.bill.bill.id, // the current bill
        product_id:product.id, 
        name:product.name,
        code:product.code,
        quantity:product.unit_amount,
        unit_type:product.unit_type_display,
        unit_amount:product.unit_amount,
        base_price:product.price,
        tax_percent:product.tax,
        tax_absolute:null,
        stock:product.stock,
        discount_absolute:null
    }
    
    return convert_item(item);
}

function convert_item(item){
    // convert bill item's stringed numbers to Big
    item.unit_amount = get_number(item.unit_amount, window.data.separator)
    item.stock = get_number(item.stock, window.data.separator)
    item.quantity = get_number(item.quantity, window.data.separator)
    item.base_price = get_number(item.base_price, window.data.separator)
    item.tax_percent = get_number(item.tax_percent, window.data.separator)
    item.total = get_number(item.total, window.data.separator)
    return item;
}

function get_item_data(item_obj){
    // retrieve everything needed to add an item to bill or update it,
    // that is:
    // bill id (the current bill)
    // item id or product id (whether adding a new one/updating existing)
    // quantity
    // discount TODO
    
    // check quantity format
    qty = $("input.item-qty", item_obj).val();
    if(!check_number(qty, window.data.separator)){
        alert(gettext("Invalid quantity format: "));
        return null;
    }
    
    // check additional discount format TODO
    item_data = {
        bill_id:window.bill.bill.id,
        item_id:item_obj.attr("data-item-id"),
        product_id:item_obj.attr("data-product-id"),
        quantity:qty,
        additional_discount:''
    }
    
    return item_data;
}

function render_bill(bill){
    // draw the whole bill on page load
    window.bill.bill = bill;
    
    // if this not a new bill (there's no .new field), 
    // alert about the last item that may or may not be there
    if(!bill.new){
        alert(gettext("This is an unfinished bill from the last session, please check the last item"));
        
        // put each of the items in this loaded bill to #bill_items
        var i, item;
        for(i = 0; i < bill.items.length; i++){
            item = convert_item(bill.items[i]);
        
            // save the last item
            window.bill.last_item = update_item(null, bill.items[i], null, null);
        }
    }
}

/* handling bill items */
function add_item(product){
    if(!window.bill.last_item){
        // this is the first item, add it immediately
        window.bill.last_item = update_item(product, null, null, false);
    }
    else{
    
        // this is not the first item
        // see if there's already an item in bill for this product
        existing_item_obj = get_bill_item(product.id);
        if(existing_item_obj){
            // there is, add <unit_amount> to existing item's quantity
            qty_obj = $("input.item-qty", existing_item_obj);
            qty = qty_obj.val();
            if(check_number(qty, window.data.separator)){
                qty = get_number(qty, window.data.separator).plus(get_number(product.unit_amount, window.data.separator));
                qty_obj.val(display_number(qty, window.data.separator, window.data.decimal_places));
            }
            // window.bill.last_item stays the same
        }
        else{
            // no, there's no item for this product in bill, update the last edited and add a new one
            // send the last edited item to the server: it will be updated when the server answers
            item_data = get_item_data(window.bill.last_item);
            if(item_data){ // something might be entered wrongly
                send_data(window.data.add_bill_item, item_data, window.data.csrf_token, function(recv_data){
                    update_item(null, convert_item(recv_data), window.bill.last_item, false);
                });
            }
            // a new item
            window.bill.last_item = update_item(product, null, null, false);
        }
    }
}

function get_bill_item(product_id){
    // returns the $("tr") object of the item we're looking for, or null if it wasn't found
    // search by product id (stored in tr.data())
    var obj = null;
    
    obj = $("tr[data-product-id='" + product_id + "']");
    if(!obj) return null; // nothing found
    else{
        // there may be more than 1 element found: check which of them has no special discounts set
        // if all of them have, return null
        var found = false;
        obj.each(function(){
            if($(this).attr('data-exploded') != 'true'){
                obj = $(this);
                found = true;
                
                return false; // breaks each() 'loop'
            }
        });
        
        if(found) return obj;
        else return null;
    }
}

function update_item(product, item, replace_obj, exploded){
    // create or update an item in the bill
    // product: dictionary (Product) (only if item is null - for adding new items without querying the server, 
    //                                later the same item will be updated with data from the server)
    // item: dictionary (BillItem)
    // replace_obj: if null, create a new item, else replace it with the new item
    // exploded:  if true, a data-attribute will be added to prevent updating quantity of this item when adding the same product

    // get the bill header, copy it and change the data to product.whatever
    // window.items.bill_header contains a <tr> 'template' for items
    // copy it to window.items.bill_items and replace the data with useful stuff
    var tmp_obj, btn_obj;
    var new_item = window.items.bill_header.clone();

    if(!item){
        // no stuff from server has been received *yet*
        // create an empty 'item' - a copy of BillItem
        item = convert_item(product_to_item(product));
    }

    new_item.removeAttr("id"); // no duplicate ids in document

    // create a new item
    // product name
    $("td.bill-item-name-container p.bill-title", new_item).text(item.name);
    // code
    tmp_obj = $("td.bill-item-name-container p.bill-subtitle", new_item);
    tmp_obj.text(item.code);
    tmp_obj.append("<br />");
    // notes
    tmp_obj.append(
        $("<input>", {type:"text", "class":"item-notes"})
    );
    
    // add/remove quantity
    function change_qty(add, obj){ // if 'add' is false subtract
        if(!add){
            // don't set a value of 0
            n = item.quantity.minus(item.unit_amount);
            if(n.cmp(Big(0)) > 0) item.quantity = n;
        }
        else{
            // when adding, check stock - do not add more items than there are in stock
            // add in increments of unit_amount
            n = item.quantity.plus(item.unit_amount);
            if(n.cmp(item.stock) <= 0) item.quantity = n;
        }
        
        // update the looks
        obj.val(display_number(item.quantity, window.data.separator, window.data.decimal_places));
        update_item_prices(item, new_item);
    }
    
    // quantity: an edit box
    tmp_obj = $("td.bill-item-qty-container p.bill-title", new_item);
    tmp_obj.empty();
    tmp_obj.append($("<input>", {"class":"item-qty", type:"text"}).val(item.quantity)
        .change(function(){
            // set the new quantity, check it and update if ok
            new_qty = get_number($(this).val(), window.data.separator);
            if(!new_qty){
                alert(gettext("Wrong quantity format"));
                new_qty = Big(1);
            }
            // check if there's enough of it in stock
            if(new_qty.cmp(item.stock) > 0){
                alert(gettext("There's not enough items in stock"));
                new_qty = item.stock;
            }
            // check if it's not negative or 0
            if(new_qty.cmp(Big(0)) <= 0){
                alert(gettext("Quantity cannot be zero or less"));
                new_qty = Big(1);
            }
            // set the new quantity and update everything
            item.quantity = new_qty;
            $(this).val(display_number(item.quantity, window.data.separator, window.data.decimal_places));
            update_item_prices(item, new_item);
        })
    );
    
    // 'plus' button
    btn_obj = $("<input>", {type:"button", "class":"qty-button", value:"+"});
    btn_obj.click(function(){ change_qty(true, $("input.item-qty", $(this).parent())); });
    tmp_obj.append(btn_obj);
    
    // 'minus' button
    btn_obj = $("<input>", {type:"button", "class":"qty-button", value:"-"});
    btn_obj.click(function(){ change_qty(false, $("input.item-qty", $(this).parent())); });
    tmp_obj.append(btn_obj);
    
    // set 'fixed' fields that cannot be changed
    // unit amount and type
    $("td.bill-item-qty-container p.bill-subtitle", new_item).empty().append(item.unit_type);
    // price will be set later
    // tax: percent only
    $("td.bill-item-tax-container p.bill-title", new_item).empty().append(display_number(item.tax_percent, window.data.separator, window.data.decimal_places));
    
    // discounts: list all discounts by type
    $("td.bill-item-discount-container p.bill-title", new_item).text(item.discount_absolute);
    // the 'more' button TODO
    
    // other data (that will change) will be set in update_item_prices()    
    
    // add data that we'll need later:
    // product id (to update quantity when adding new product )
    new_item.attr('data-product-id', item.product_id);
    // item id
    new_item.attr('data-item-id', item.id);
    // exploded (to NOT update quantity when adding a new product)
    if(exploded){
        // do not add quantity to this item
        new_item.attr('data-exploded', 'true');
    }
    
    // remove and 'explode' buttons
    tmp_obj = $("td.bill-item-edit", new_item);
    btn_obj = $("<button>").append("X"); // delete button
    
    tmp_obj.append(btn_obj).append("<br />");
    
    if(!exploded){
        btn_obj = $("<button>").append("폭"); // 'explode' button
        tmp_obj.append(btn_obj);
    }
    
    // create a new item or replace an existing one
    if(!replace_obj){
        // nothing to replace, append new
        window.items.bill_items.append(new_item);
    }
    else{
        // replace
        replace_obj.replaceWith(new_item);
    }
    
    // set prices etc.
    update_item_prices(item, new_item);
    
    return new_item; // chainability
}

function update_item_prices(item, obj){
    // item - 'json'
    // obj - jquery object, bill item
    r = total_price(window.data.tax_first, item.base_price, item.tax_percent, [], item.quantity, window.data.separator);

    // base price
    $("td.bill-item-price-container p.bill-title", obj).text(display_number(r.base, window.data.separator, window.data.decimal_places));
    
    // tax (only absolute value)
    $("td.bill-item-tax-container p.bill-subtitle", obj).text(display_number(r.tax, window.data.separator, window.data.decimal_places));
    
    // discounts
    
    // total
    $("td.bill-item-total-container p.bill-title", obj).text(display_number(r.total, window.data.separator, window.data.decimal_places));
}
