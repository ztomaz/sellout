Contacts = function(g){
    // a list of contacts (ready to be used for writing bills)
    var p = this;

    p.g = g;

    // data (will be initialized below, under init)
    p.individuals_list = []; // a list for autocomplete {label:. value:}
    p.individuals_by_id = {};

    p.companies_list = [];
    p.companies_by_id = {};

    p.selected_id = null; // will be used on save

    // dialog and its items
    p.dialog = $("#contacts");
    p.individual_form = $(".individual-form", p.dialog);
    p.company_form = $(".company-form", p.dialog);

    p.items = {
        individual: {
            first_name: $(".first-name", p.individual_form),
            last_name: $(".last-name", p.individual_form),
            sex: $(".sex", p.individual_form),
            email: $(".email", p.individual_form),
            street_address: $(".street-address", p.individual_form),
            postcode: $(".postcode", p.individual_form),
            city: $(".city", p.individual_form),
            state: $(".state", p.individual_form),
            country: $(".country", p.individual_form),
            phone: $(".phone", p.individual_form),
            date_of_birth: $(".date-of-birth", p.individual_form)
        },
        company: {
            name: $(".name", p.company_form),
            email: $(".email", p.company_form),
            street_address: $(".street-address", p.company_form),
            postcode: $(".postcode", p.company_form),
            city: $(".city", p.company_form),
            state: $(".state", p.company_form),
            country: $(".country", p.company_form),
            phone: $(".phone", p.company_form),
            vat: $(".vat", p.company_form)
        },
        company_switch: $(".company-switch", p.dialog),
        individual_switch: $(".individual-switch", p.dialog)
    };

    p.dialog_width = parseInt(p.dialog.css("width")); // only works for the first time,
                                                      // then the div is hidden and
                                                      // its width is zero
    //
    // methods
    //
    p.prepare_contact = function(c){
        var t;

        // adds contact to internal dictionaries for later retrieval
        if(c.type == 'Company'){
            if(c.vat) t = c.vat + ": ";
            else t = "";

            p.companies_list.push({
                label: t + c.company_name,
                value: c.id
            });

            p.companies_by_id[c.id] = c;
        }
        else{
            if(c.street_address) t = ", " + c.street_address;
            else t = "";


            p.individuals_list.push({
                label: c.first_name + " " + c.last_name + t,
                value: c.id
            });

            p.individuals_by_id[c.id] = c;
        }
    };

    p.choose_contact = function(){
        // return contact id or null if nothing has been chosen
        p.dialog.dialog({
            width: p.dialog_width, // use the dialog's width
            modal: true,
            title: gettext("Select contact")
        });
    };

    p.toggle_type = function(company){
        if(company){
            // hide the individual form and change buttons' classes
            p.individual_form.hide();
            p.items.individual_switch.removeClass("active");

            p.company_form.show();
            p.items.company_switch.addClass("active");
        }
        else{
            p.individual_form.show();
            p.items.individual_switch.addClass("active");

            p.company_form.hide();
            p.items.company_switch.removeClass("active");
        }
    };

    p.clear_fields = function(){
        var key;
        for(key in p.items.company){
            if(p.items.company.hasOwnProperty(key)){
                p.items.company[key].val("");
            }
        }

        for(key in p.items.individual){
            if(p.items.individual.hasOwnProperty(key)){
                p.items.individual[key].val("");
            }
        }

        // some special fields:
        // countries: choose the company's country
        p.items.company.country.val(p.g.data.company.country);
        p.items.individual.country.val(p.g.data.company.country);
        // sex: undisclosed
        p.items.individual.sex.val("U");
    };

    p.select_company = function(id){
        if(!id){
            p.clear_fields();
            p.selected_id = null;
        }

        // get the company details from the id and fill all data
        var c = p.companies_by_id[id];

        p.items.company.name.val(c.company_name);
        p.items.company.email.val(c.email);
        p.items.company.street_address.val(c.street_address);
        p.items.company.postcode.val(c.postcode);
        p.items.company.city.val(c.city);
        p.items.company.state.val(c.state);
        p.items.company.country.val(c.country);
        p.items.company.phone.val(c.phone);
        p.items.company.vat.val(c.vat);

        p.selected_id = id;
    };

    p.select_individual = function(id){
        if(!id){
            p.clear_fields();
            p.selected_id = null;
        }

        // get the company details from the id and fill all data
        var c = p.individuals_by_id[id];

        p.items.individual.first_name.val(c.first_name);
        p.items.individual.last_name.val(c.last_name);
        p.items.individual.sex.val(c.sex);
        p.items.individual.street_address.val(c.street_address);
        p.items.individual.postcode.val(c.postcode);
        p.items.individual.city.val(c.city);
        p.items.individual.state.val(c.state);
        p.items.individual.country.val(c.country);
        p.items.individual.email.val(c.email);
        p.items.individual.phone.val(c.phone);
        p.items.individual.date_of_birth.val(c.date_of_birth);

        p.selected_id = id;
    };

    p.create_contact = function(){
        var data;

        // see which type of contact is being created (check button classes)
        if(p.items.individual_switch.hasClass("active")){
            // it's an individual
            data = {
                type: 'Individual',
                first_name: p.items.individual.first_name.val(),
                last_name: p.items.individual.last_name.val(),
                sex: p.items.individual.sex.val(),
                street_address: p.items.individual.street_address.val(),
                postcode: p.items.individual.postcode.val(),
                city: p.items.individual.city.val(),
                state: p.items.individual.state.val(),
                country: p.items.individual.country.val(),
                email: p.items.individual.email.val(),
                phone: p.items.individual.phone.val(),
                date_of_birth: p.items.individual.date_of_birth.val()
            };
        }
        else{
            // it's a company
            data = {
                type: 'Company',
                company_name: p.items.company.name.val(),
                street_address: p.items.company.street_address.val(),
                postcode: p.items.company.postcode.val(),
                city: p.items.company.city.val(),
                state: p.items.company.state.val(),
                country: p.items.company.country.val(),
                email: p.items.company.email.val(),
                phone: p.items.company.phone.val(),
                vat: p.items.company.vat.val()
            }
        }

        send_data(p.g.urls.quick_create_contact, data, p.g.csrf_token, function(response){
            if(response.status != 'ok'){
                error_message(
                    gettext("Saving contact failed"),
                    response.message
                );
            }
            else{
                // add the new contact to current lists
                p.prepare_contact(response.data);
                // the contact is added
                p.selected_id = response.data.id;
            }
        });
    };

    p.close_action = function(){

    };

    //
    // init
    //

    // buttons and bindings
    p.toggle_type(true); // default is company
    p.items.individual_switch.click(function(){ p.toggle_type(false); });
    p.items.company_switch.click(function(){ p.toggle_type(true); });

    // prepare data: labels and values
    for(var i = 0; i < p.g.data.contacts.length; i++){
        p.prepare_contact(p.g.data.contacts[i]);

    }

    // initialize autocompletes
    p.items.company.name.autocomplete({
        source: p.companies_list,
        appendTo: p.dialog,
        select: function(event, ui){
            // on select event: fill in the company details
            p.select_company(ui.item.value); // value contains company id

            event.preventDefault();
        }
    });

    p.items.individual.first_name.autocomplete({
        source: p.individuals_list,
        appendTo: p.dialog,
        select: function(event, ui){
            // on select event: fill in the company details
            p.select_individual(ui.item.value); // value contains company id

            event.preventDefault();
        }
    });

    // clear if there's anything left from the previous contact
    p.clear_fields();
};