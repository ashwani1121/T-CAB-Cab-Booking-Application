const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Complaint     = sequelize.define(
    'Complaint',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        ticket_no: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Unique ticket number for the complaint (e.g., TKT-00000001)'
        },
        category_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'category_complaints',
                key: 'id'
            }
        },
        subcategory_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'subcategory_complaints',
                key: 'id'
            }
        },
        attachments: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'JSON array of attachment file paths',
            get(){
                const rawValue = this.getDataValue('attachments');
                return rawValue ? JSON.parse(rawValue) : [];
            },
            set(value){
                this.setDataValue('attachments', value ? JSON.stringify(value) : null);
            }
        },
        custom_query: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Custom query when "Others" category is selected'
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'User who the complaint is about (passenger or driver)'
        },
        user_type: {
            type: DataTypes.ENUM('passenger', 'driver'),
            allowNull: false,
            comment: 'Type of user: passenger or driver'
        },
        ride_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'ride_requests',
                key: 'id'
            },
            comment: 'The ride this complaint is related to'
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Title cannot be empty'
                },
                len: {
                    args: [1, 255],
                    msg: 'Title must be between 1 and 255 characters'
                }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('open', 'resolved', 'escalate', 'closed', 'reopen'),
            defaultValue: 'open',
            comment: 'Ticket status: open, resolved, escalate, closed, reopen'
        },
        status_color: {
            type: DataTypes.STRING(7),
            allowNull: true,
            comment: 'Hex color code for status visibility (e.g., #FF5733)'
        },
        owner_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Current owner of the complaint (can be transferred)'
        },
        resolved_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        resolved_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        escalated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when complaint was escalated'
        },
        closed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when complaint was closed'
        },
        reopened_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when complaint was reopened'
        },
        resolution_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Admin who created this complaint'
        },
        updated_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Admin who last updated this complaint'
        }
    },
    {
        tableName: 'complaints',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['ticket_no'], unique: true },
            { fields: ['user_id'] },
            { fields: ['user_type'] },
            { fields: ['ride_id'] },
            { fields: ['category_id'] },
            { fields: ['subcategory_id'] },
            { fields: ['status'] },
            { fields: ['owner_id'] }, 
            { fields: ['created_at'] }
        ],
        hooks: {
            beforeValidate: async (complaint) => {
                // Generate ticket number if not exists
                if(!complaint.ticket_no){
                    const lastComplaint = await Complaint.findOne({
                        order: [['id', 'DESC']],
                        attributes: ['id']
                    });
                    const nextId        = lastComplaint ? lastComplaint.id + 1 : 1;
                    complaint.ticket_no = `TKT-${String(nextId).padStart(8, '0')}`;
                }
            },
            beforeSave: (complaint) => {
                // Auto-assign status colors based on status
                const statusColorMap = {
                    'open'      : '#3B82F6', 
                    'resolved'  : '#10B981',  
                    'escalate'  : '#F59E0B',  
                    'closed'    : '#6B7280',  
                    'reopen'    : '#EF4444'   
                };
                if(complaint.status && !complaint.status_color){
                    complaint.status_color = statusColorMap[complaint.status];
                }
            }
        }
    }
);
module.exports = Complaint;