Payment = function(g, bill){
    // this object is called after the bill has been sent to server and checked;
    // choose payment type, pay and confirm (bitcoin and similar),
    // then create a new bill
    var p = this;

    p.g = g;
    p.bill = bill;
    p.data = p.bill.data;

    p.dialog = $("#payment");
    p.items = {
        cash:{
             button: $(".payment-type.cash", p.dialog),
             section: $(".payment-details.cash", p.dialog),
             paid_box: $(".cash .customer-paid", p.dialog),
             return_box: $(".cash .return-change", p.dialog)
        },
        credit_card:{
            button: $(".payment-type.credit-card", p.dialog),
            section: $(".payment-details.credit-card", p.dialog)
        },
        bitcoin:{
            button: $(".payment-type.bitcoin", p.dialog),
            section: $(".payment-details.bitcoin", p.dialog)
        },

        total: $(".bill-total-number", p.dialog), // common to all sections (payment types)
        shadow: $("#fullscreen_shadow"),

        print_button: $(".print", p.dialog)
    };

    //
    // methods
    //
    p.switch_section = function(section){
        // the last section is stored in g.settings

        // first, hide the last section
        switch(p.g.settings.last_payment_type){
            case "cash":
                p.items.cash.button.removeClass("active");
                p.items.cash.section.hide();
                break;
            case "credit-card":
                p.items.credit_card.button.removeClass("active");
                p.items.credit_card.section.hide();
                break;
            case "bitcoin":
                p.items.bitcoin.button.removeClass("active");
                p.items.bitcoin.section.hide();
                break;
        }

        // now display the required section
        p.g.settings.last_payment_type = section;

        switch(p.g.settings.last_payment_type){
            case "cash":
                p.items.cash.button.addClass("active");
                p.items.cash.section.show();

                p.items.cash.paid_box.val("");
                p.items.cash.return_box.val("");

                p.items.cash.paid_box.focus();
                break;
            case "credit-card":
                p.items.credit_card.button.addClass("active");
                p.items.credit_card.section.show();
                break;
            case "bitcoin":
                p.items.bitcoin.button.addClass("active");
                p.items.bitcoin.section.show();
                break;
        }
    };

    p.toggle_dialog = function(show){
        if(show){
            p.dialog.show();
            p.items.shadow.fadeIn("fast");
        }
        else{
            p.dialog.hide();
            p.items.shadow.fadeOut("fast");
        }
    };

    p.print = function(){
        // decide what to do depending on user's print settings

        // printer driver:
        switch(p.g.objects.terminal.register.printer_driver){
            case 'System':
                // create a fine html graphics, just check the receipt format first
                if(p.g.objects.terminal.register.receipt_format == 'Thermal'){
                    // use the default printer;
                    // create a HTML receipt and issue javascript print() method and that's it
                    var receipt = format_small_receipt(p.g, p.bill);

                    // TODO: temporary
                    //receipt.appendTo("body").show();
                    // TODO: permanent
                    receipt.printThis();

                    receipt.remove();
                }
                else{
                    alert("printing on A4");
                }
                break;
            default:
                alert("Printer driver not implemented: " +
                    p.g.objects.terminal.register.printer_driver);
                break;
        }
    };


    p.finish = function(){
        // send an update of the bill to the server and print the bill
        var data = {
            bill_id: p.data.id,
            payment_type: p.g.settings.last_payment_type
        };

        switch(data.payment_type){
            case 'cash':
                data.payment_reference = p.items.cash.paid_box.val();
                break;
            case 'credit-card':

                break;
            case 'bitcoin':

                break;
        }

        send_data(p.g.urls.finish_bill, data, p.g.csrf_token, function(response){
            if(response.status != 'ok'){
                error_message(
                    gettext("Could not save bill"),
                    response.message
                );
            }
            else{
                // everything is OK, print the thing
                p.print();

                // the deal is finished. clear all stuff and create a new bill
                p.g.objects.bill.reset();

                // close the dialog
                p.toggle_dialog(false);
            }
        });
    };

    //
    // init
    //
    // events:
    // buttons
    p.items.cash.button.unbind().click(function(){ p.switch_section("cash"); });
    p.items.credit_card.button.unbind().click(function(){ p.switch_section("credit-card"); });
    p.items.bitcoin.button.unbind().click(function(){ p.switch_section("bitcoin"); });

    // show the details
    if(!p.g.settings.last_payment_type) p.g.settings.last_payment_type = "cash";
    p.switch_section(p.g.settings.last_payment_type);

    // set total text
    p.items.total.text(p.data.total);

    // cash section: calculate return change on text input
    p.items.cash.paid_box.unbind().keyup(function(){
        var total = get_number(p.data.total, p.g.config.separator);
        if(!total){
            console.error("Bill has invalid total value");
            return; // wtf!
        }

        var paid = get_number($(this).val(), p.g.config.decimal_separator);
        if(!paid) return; // just ignore this key

        var ret = paid.minus(total);

        p.items.cash.return_box.val(dn(ret, p.g));
    });

    // the print ( = finish) button
    p.items.print_button.unbind().click(p.finish);

    // show the dialog
    p.toggle_dialog(true);
};