// utilities for calculation of prices etc.
function check_number(string, separator){
    // returns true if string parsed to BigNumber successfully, or false otherwise
    try{
        get_number(string, separator);
        return true;
    }
    catch (error) {
        return false;
    }
}

function get_number(string, separator){
    // receives a string with number with decimal separator <separator> and returns BigNumber
    // bignumber: https://github.com/MikeMcl/bignumber.js/
    try{
        return Big(string.replace(separator, "."));
    }
    catch(error){
        return null;
    }
}

function display_number(number, separator, decimal_places){
    // receives a BigNumber as a parameter and returns a string with user specified decimal separator
    if(number) return number.toFixed(decimal_places).replace('.', separator);
    else return '';
}

function do_tax(p_incl, p_excl, tax){
    // add or remove tax from price

    // p_incl: price including tax | one of these
    // p_excl: price excluding tax | must be null
    // all parameters are Big()numbers
    if(p_incl) p = p_incl;
    else p = p_excl;

    if(p_incl){ // subtract tax from price
        return p.div(Big(1).plus(tax.div(Big(100))));
    }
    else{ // add tax to price
        return p.times(Big(1).plus(tax.div(Big(100))));
    }
}

function total_price(tax_first, base_price, tax, discounts, quantity, unit_amount, separator){
    // calculates total price
    // parameters:
    // tax_first: if true, first tax is added and then discounts, else v.v.
    // base: base price, Big()
    // tax: tax in percent, Big()
    // discounts: list of discounts (from py's discount_to_dict())

    // if anything fails, returns null
    // if all is OK, returns {base, discount, tax, total}, all Big()
    function discounts_total(p, d){ // price, discounts[]
        var discount = Big(0);
        var final = p;
        var this_discount;

        for(var i = 0; i < d.length; i++){
            if(d[i].type == 'Absolute'){
                this_discount = get_number(d[i].amount, separator);
                final = final.minus(this_discount);
                discount = discount.plus(this_discount);
            }
            else{
                this_discount = final.times(get_number(d[i].amount, separator).div(Big(100)));
                discount = discount.plus(this_discount);
                final = final.minus(this_discount)
            }
        }
        return {discount:discount, final:final};
    }

    var r = {};
    var t;

    if(tax_first){
        // base price
        r.base = base_price;

        // price including tax
        r.tax_price = do_tax(null, base_price, tax);
        if(!r.tax_price) return null;

        // absolute tax value
        r.tax = r.tax_price.minus(base_price);
        if(!r.tax) return null;

        // absolute discounts value
        t = discounts_total(r.tax_price, discounts);
        r.discount = t.discount;
        if(!r.discount) return null;

        // total, with tax and discounts
        r.total = t.final;

        // total without tax
        r.total_tax_exc = r.total.minus(r.tax);
    }
    else{
        // subtract discounts from base
        t = subtract_discounts(base_price, discounts);

        r.discount = t.discount;
        if(!r.discount) return null;

        // price including discounts
        r.discount_price = t.final;
        if(!r.discount_price) return null;

        // add tax
        r.tax_price = do_tax(null, r.discount_price, tax);
        if(!r.tax_price) return null;

        // get absolute tax value
        r.tax = r.tax_price.minus(r.discount_price);
        if(!r.tax_price) return null;

        r.total = r.tax_price;

        // total without tax
        r.total_tax_exc = r.discount_price;
    }

    // multiply everything by quantity and unit amount
    t = quantity.times(unit_amount);
    r.base = r.base.times(t); // without tax and discounts
    r.tax = r.tax.times(t);   // tax, absolute
    r.discount = r.discount.times(t); // discounts, absolute
    r.total_tax_exc = r.total_tax_exc.times(t); // total without tax
    r.total = r.total.times(t); // total total total

    return r;
}